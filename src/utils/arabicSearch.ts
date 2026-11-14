/**
 * Arabic Search & Ranking Utility
 * Provides fast, fuzzy, diacritic-insensitive Arabic text normalization
 * and highly accurate name matching so that entering each letter or word
 * immediately matches the person across first name, middle name, or last name.
 */

/**
 * Normalizes Arabic text for flexible matching:
 * - Strips tashkeel (fatha, damma, kasra, sukun, tanween, shadda, dagger alif, etc.)
 * - Strips tatweel (kashida)
 * - Normalizes Alef forms (أ, إ, آ, ٱ -> ا)
 * - Normalizes Alef Maqsura (ى -> ي)
 * - Normalizes Taa Marbouta (ة -> ه)
 * - Normalizes Hamza variants (ؤ, ئ -> ء)
 * - Collapses repeated whitespaces
 * - Converts Arabic digits to English digits
 */
export function normalizeArabicText(text?: string | null): string {
  if (!text) return '';
  return text
    // Arabic digits to English digits
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    // Remove diacritics / tashkeel
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // Remove tatweel (kashida)
    .replace(/\u0640/g, '')
    // Normalize Alefs
    .replace(/[أإآٱ]/g, 'ا')
    // Normalize Alef Maqsura to Yaa
    .replace(/[ى]/g, 'ي')
    // Normalize Taa Marbouta to Haa
    .replace(/[ة]/g, 'ه')
    // Normalize Waw with Hamza & Yaa with Hamza
    .replace(/[ؤئ]/g, 'ء')
    // Remove punctuation & special characters
    .replace(/[\.,\/#!$%\^&\*;:{}=\-_`~()?"'«»[\]]/g, ' ')
    // Lowercase
    .toLowerCase()
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strips the definite article 'ال' if word starts with it and has more letters
 * Example: 'الغامدي' -> 'غامدي', 'العتيبي' -> 'عتيبي', 'القرني' -> 'قرني'
 */
export function stripAlPrefix(token: string): string {
  if (token.startsWith('ال') && token.length > 2) {
    return token.slice(2);
  }
  return token;
}

/**
 * Extracts all searchable name components (first name, middle names, patronymics,
 * compound parts, and tribal/family surnames with and without 'ال').
 */
export function extractNameTokens(name?: string | null): string[] {
  const norm = normalizeArabicText(name);
  if (!norm) return [];

  const rawWords = norm.split(' ').filter(Boolean);
  const words: string[] = [];

  for (let i = 0; i < rawWords.length; i++) {
    const w = rawWords[i];
    // Skip patronymic linkers in tokens
    if (w === 'بن' || w === 'ابن' || w === 'بنت' || w === 'ابنه') {
      continue;
    }

    // Compound name parts: e.g. "عبد" + "الله" -> "عبدالله", "عبد", "الله"
    if (
      (w === 'عبد' || w === 'ابو' || w === 'ابي' || w === 'ام') &&
      i + 1 < rawWords.length
    ) {
      const nextW = rawWords[i + 1];
      words.push(w + nextW);
      words.push(w);
      words.push(nextW);
      i++;
      continue;
    }

    words.push(w);

    // If word is already a compound name e.g. "عبدالله" / "عبدالعزيز"
    if (w.startsWith('عبد') && w.length > 3) {
      words.push('عبد');
      words.push(w.slice(3));
    }

    // Surnames with 'ال'
    if (w.startsWith('ال') && w.length > 3) {
      words.push(stripAlPrefix(w));
    }
  }

  return Array.from(new Set(words));
}

export interface ArabicNameStructure {
  raw: string;
  normalized: string;
  firstName: string;
  middleNames: string[];
  lastName: string;
  allTokens: string[];
}

export function parseArabicName(fullName?: string | null): ArabicNameStructure {
  const raw = fullName?.trim() || '';
  const normalized = normalizeArabicText(raw);

  if (!normalized) {
    return {
      raw,
      normalized: '',
      firstName: '',
      middleNames: [],
      lastName: '',
      allTokens: [],
    };
  }

  const allTokens = extractNameTokens(raw);
  const rawWords = normalized.split(' ').filter(Boolean);
  const contentTokens = rawWords.filter(
    (t) => t !== 'بن' && t !== 'ابن' && t !== 'بنت' && t !== 'ابنه'
  );

  let firstName = contentTokens[0] || '';
  let lastName = '';
  if (contentTokens.length > 1) {
    lastName = contentTokens[contentTokens.length - 1];
  }

  const middleNames: string[] = [];
  if (contentTokens.length > 2) {
    for (let i = 1; i < contentTokens.length - 1; i++) {
      middleNames.push(contentTokens[i]);
    }
  }

  return {
    raw,
    normalized,
    firstName,
    middleNames,
    lastName,
    allTokens,
  };
}

/**
 * Calculates a search relevance score for a target Arabic name against a user query.
 * Designed so that entering EACH LETTER or word accurately surfaces matching students,
 * regardless of whether the match is in the first name, middle name, or last name.
 *
 * Scoring Hierarchy:
 * - Exact name match: ~100,000 (whether first, middle, or last name!)
 * - Prefix match (word starts with query): ~80,000 (triggers on each letter entered!)
 * - Substring match inside a name word: ~50,000
 * - Continuous phrase match in full name: ~40,000
 * - Extra fields match (phone, email, halaqah): ~10,000
 * - No match: 0
 */
export function scoreArabicNameSearch(
  targetName: string | undefined | null,
  searchQuery: string,
  extraSearchableFields?: (string | undefined | null)[]
): number {
  if (!searchQuery || !searchQuery.trim()) {
    return 1; // All match when no query
  }

  const qNorm = normalizeArabicText(searchQuery);
  if (!qNorm) return 1;

  const targetNorm = normalizeArabicText(targetName);
  if (!targetNorm) {
    return checkExtraFields(extraSearchableFields, qNorm);
  }

  // Exact full name match
  if (targetNorm === qNorm) {
    return 200000;
  }

  const targetNoSpace = targetNorm.replace(/\s+/g, '');
  const queryNoSpace = qNorm.replace(/\s+/g, '');
  if (targetNoSpace === queryNoSpace) {
    return 190000;
  }

  const targetTokens = extractNameTokens(targetName);
  const queryWords = qNorm.split(' ').filter(Boolean);

  // SINGLE WORD OR SINGLE LETTER QUERY (e.g. "خ", "ع", "م", "خالد", "احمد", "القرني")
  if (queryWords.length === 1) {
    const q = queryWords[0];
    const qNoAl = stripAlPrefix(q);
    let bestScore = 0;

    for (let idx = 0; idx < targetTokens.length; idx++) {
      const w = targetTokens[idx];
      const wNoAl = stripAlPrefix(w);

      // Exact word match (e.g. "خالد" matches first, middle, or last name)
      if (w === q || wNoAl === qNoAl || w === qNoAl || wNoAl === q) {
        const score = 100000 - idx;
        if (score > bestScore) bestScore = score;
      }
      // Word starts with query (Prefix match: triggers on EACH letter entered!)
      else if (
        w.startsWith(q) ||
        wNoAl.startsWith(qNoAl) ||
        wNoAl.startsWith(q) ||
        w.startsWith(qNoAl)
      ) {
        const score = 80000 - idx;
        if (score > bestScore) bestScore = score;
      }
      // Substring match inside word
      else if (w.includes(q) || wNoAl.includes(qNoAl) || wNoAl.includes(q)) {
        const score = 50000 - idx;
        if (score > bestScore) bestScore = score;
      }
    }

    if (bestScore > 0) {
      return bestScore;
    }

    // Full name continuous substring match
    if (targetNorm.includes(qNorm) || targetNoSpace.includes(queryNoSpace)) {
      return 40000;
    }

    // Check extra fields (phone, email, halaqah)
    return checkExtraFields(extraSearchableFields, qNorm);
  }

  // MULTI-WORD QUERY (e.g. "محمد القرني", "عبدالله احمد", "عمر العتيبي")
  let totalScore = 0;
  let allMatched = true;

  for (const qWord of queryWords) {
    let wordScore = 0;
    const qNoAl = stripAlPrefix(qWord);

    for (const w of targetTokens) {
      const wNoAl = stripAlPrefix(w);
      if (w === qWord || wNoAl === qNoAl || w === qNoAl || wNoAl === qWord) {
        wordScore = Math.max(wordScore, 100000);
      } else if (
        w.startsWith(qWord) ||
        wNoAl.startsWith(qNoAl) ||
        wNoAl.startsWith(qWord)
      ) {
        wordScore = Math.max(wordScore, 80000);
      } else if (w.includes(qWord) || wNoAl.includes(qNoAl)) {
        wordScore = Math.max(wordScore, 50000);
      }
    }

    if (wordScore === 0) {
      allMatched = false;
      break;
    }
    totalScore += wordScore;
  }

  if (allMatched) {
    return totalScore;
  }

  // Fallback: check continuous phrase match in full name
  if (targetNorm.includes(qNorm) || targetNoSpace.includes(queryNoSpace)) {
    return 40000;
  }

  return checkExtraFields(extraSearchableFields, qNorm);
}

function checkExtraFields(
  extraFields?: (string | undefined | null)[],
  queryNorm?: string
): number {
  if (!extraFields || !queryNorm) return 0;
  for (const field of extraFields) {
    if (!field) continue;
    const norm = normalizeArabicText(field);
    if (norm.includes(queryNorm)) {
      return 10000;
    }
    const rawClean = field.toLowerCase().replace(/\s+/g, '');
    const qClean = queryNorm.toLowerCase().replace(/\s+/g, '');
    if (rawClean.includes(qClean)) {
      return 10000;
    }
  }
  return 0;
}

/**
 * Filter and sort a list of items using Arabic name search and priority ranking.
 * If query is empty, returns original list in its current sort order.
 * If query is present, filters items and orders them with highest relevance scores first.
 */
export function searchAndRankArabic<T>(
  items: T[],
  query: string,
  getName: (item: T) => string | undefined | null,
  getExtraFields?: (item: T) => (string | undefined | null)[]
): T[] {
  if (!query || !query.trim()) {
    return items;
  }

  const scored: { item: T; score: number }[] = [];

  for (const item of items) {
    const name = getName(item);
    const extra = getExtraFields ? getExtraFields(item) : undefined;
    const score = scoreArabicNameSearch(name, query, extra);
    if (score > 0) {
      scored.push({ item, score });
    }
  }

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  return scored.map((s) => s.item);
}
