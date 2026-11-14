// Utility to ensure ALL numbers, dates, and times are displayed in standard English/Western numerals (0-9)

/**
 * Converts any Arabic-Indic digits (٠-٩) to standard English numerals (0-9)
 */
export function toEnglishDigits(input: string | number | undefined | null): string {
  if (input === undefined || input === null) return '';
  const str = String(input);
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return str.replace(/[٠-٩]/g, (d) => String(arabicDigits.indexOf(d)));
}

/**
 * Format a number with standard commas in English (e.g. 1,250)
 */
export function formatNumberEn(num: number | string | undefined | null): string {
  if (num === undefined || num === null) return '0';
  const val = typeof num === 'string' ? parseFloat(toEnglishDigits(num)) : num;
  if (isNaN(val)) return '0';
  return val.toLocaleString('en-US');
}

/**
 * Format date in English numerals as YYYY/MM/DD or D/M/YYYY
 */
export function formatDateEn(dateInput?: string | Date | null): string {
  if (!dateInput) return '—';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return toEnglishDigits(String(dateInput));
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

/**
 * Format short date (MM/DD) in English numerals
 */
export function formatShortDateEn(dateInput?: string | Date | null): string {
  if (!dateInput) return '—';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return toEnglishDigits(String(dateInput));
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${month}/${day}`;
}

/**
 * Format time in English numerals (e.g. 04:30 PM)
 */
export function formatTimeEn(dateInput?: string | Date | null, includeSeconds = false): string {
  if (!dateInput) return '—';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return toEnglishDigits(String(dateInput));
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'م' : 'ص';
  hours = hours % 12 || 12;
  return includeSeconds
    ? `${hours}:${minutes}:${seconds} ${ampm}`
    : `${hours}:${minutes} ${ampm}`;
}

/**
 * Returns Arabic day of the week
 */
export function getDayNameAr(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';
  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  return days[d.getDay()];
}

/**
 * Checks if a date is an official Quran class day.
 * Classes are exclusively Sunday (0) to Wednesday (3).
 * Thursday (4), Friday (5), Saturday (6) are off/weekend days.
 */
export function isClassDay(dateInput?: string | Date | null): boolean {
  if (!dateInput) return false;
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return false;
  const day = d.getDay();
  return day >= 0 && day <= 3; // 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday
}

/**
 * Returns the array of YYYY-MM-DD date strings for the 4 official class days
 * (Sunday, Monday, Tuesday, Wednesday) of the current week.
 * Week starts on Sunday.
 */
export function getCurrentWeekClassDates(refDate: Date = new Date()): string[] {
  const d = new Date(refDate);
  const day = d.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  // Find Sunday of this week
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - day);

  const dates: string[] = [];
  for (let i = 0; i < 4; i++) {
    const classDay = new Date(sunday);
    classDay.setDate(sunday.getDate() + i);
    const yyyy = classDay.getFullYear();
    const mm = String(classDay.getMonth() + 1).padStart(2, '0');
    const dd = String(classDay.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
  }
  return dates;
}

/**
 * Formats date into accurate Hijri calendar representation with English numerals (e.g. 22 صفر 1448 هـ)
 */
export function formatHijriDate(dateInput?: string | Date | null): string {
  if (!dateInput) return '—';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '—';

  try {
    const formatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const hijriRaw = formatter.format(d);
    // Convert any Arabic-indic digits into English digits and ensure exactly one "هـ" suffix
    const cleaned = toEnglishDigits(hijriRaw).replace(/هـ/g, '').trim();
    return `${cleaned} هـ`;
  } catch {
    try {
      const fallbackFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      const hijriRaw = fallbackFormatter.format(d);
      const cleaned = toEnglishDigits(hijriRaw).replace(/هـ/g, '').trim();
      return `${cleaned} هـ`;
    } catch {
      return '—';
    }
  }
}

/**
 * Formats date into Hijri Month and Year only (e.g. ربيع الآخر 1448 هـ)
 */
export function formatHijriMonthYear(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';

  try {
    const formatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
      month: 'long',
      year: 'numeric',
    });
    const raw = formatter.format(d);
    const cleaned = toEnglishDigits(raw).replace(/هـ/g, '').trim();
    return `${cleaned} هـ`;
  } catch {
    try {
      const fallbackFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
        month: 'long',
        year: 'numeric',
      });
      const raw = fallbackFormatter.format(d);
      const cleaned = toEnglishDigits(raw).replace(/هـ/g, '').trim();
      return `${cleaned} هـ`;
    } catch {
      return '';
    }
  }
}

/**
 * Formats date combining Gregorian and Hijri with English numerals
 * e.g. "2026/09/04 م (22 صفر 1448 هـ)"
 */
export function formatDateWithHijri(dateInput?: string | Date | null): string {
  if (!dateInput) return '—';
  const greg = formatDateEn(dateInput);
  const hijri = formatHijriDate(dateInput);
  return hijri !== '—' ? `${greg} م (${hijri})` : `${greg} م`;
}

/**
 * Formats full date with day name, Gregorian, and Hijri date
 * e.g. "الأحد، 2026/09/04 م - 22 صفر 1448 هـ"
 */
export function formatFullDateWithDayAndHijri(dateInput?: string | Date | null): string {
  if (!dateInput) return '—';
  const dayName = getDayNameAr(dateInput);
  const greg = formatDateEn(dateInput);
  const hijri = formatHijriDate(dateInput);
  if (hijri !== '—') {
    return `${dayName}، ${greg} م - ${hijri}`;
  }
  return `${dayName}، ${greg} م`;
}

/**
 * Formats Hifz target text for a recitation log without redundant prefixes
 */
export function formatSessionHifzText(log: {
  isSurahRange?: boolean;
  fromSurahNumber?: number;
  toSurahNumber?: number;
  fromSurahName?: string;
  toSurahName?: string;
  surahName: string;
  startAyah: number;
  endAyah: number;
  ayahsCount: number;
}): string {
  if (log.isSurahRange) {
    if (log.fromSurahNumber && log.toSurahNumber && log.fromSurahNumber === log.toSurahNumber) {
      const sName = (log.fromSurahName || log.surahName)
        .replace(/^من سورة\s+/, '')
        .replace(/\s+إلى سورة.*$/, '')
        .replace(/^سورة\s+/, '');
      return `سورة ${sName} (كاملة - ${formatNumberEn(log.ayahsCount)} آية)`;
    }
    const cleanName = log.surahName.startsWith('من سورة')
      ? log.surahName
      : `من سورة ${log.fromSurahName || log.surahName} إلى سورة ${log.toSurahName || ''}`;
    return `${cleanName} (${formatNumberEn(log.ayahsCount)} آية)`;
  }
  const cleanSurah = (log.surahName || '').replace(/^سورة\s+/, '');
  return `سورة ${cleanSurah} (${formatNumberEn(log.startAyah)}-${formatNumberEn(log.endAyah)})`;
}

/**
 * Formats Murajaah target text for a recitation log without redundant prefixes
 */
export function formatSessionMurajaahText(log: {
  murajaahIsSurahRange?: boolean;
  murajaahFromSurahNumber?: number;
  murajaahToSurahNumber?: number;
  murajaahFromSurahName?: string;
  murajaahToSurahName?: string;
  murajaahSurahName?: string;
  surahName?: string;
  murajaahStartAyah?: number;
  murajaahEndAyah?: number;
  murajaahAyahsCount?: number;
  ayahsCount?: number;
}): string {
  const isRange = log.murajaahIsSurahRange;
  const mName = (log.murajaahSurahName || log.surahName || '').trim();
  const ayahsCount = log.murajaahAyahsCount || log.ayahsCount || 0;

  if (isRange) {
    if (log.murajaahFromSurahNumber && log.murajaahToSurahNumber && log.murajaahFromSurahNumber === log.murajaahToSurahNumber) {
      const sName = (log.murajaahFromSurahName || mName)
        .replace(/^من سورة\s+/, '')
        .replace(/\s+إلى سورة.*$/, '')
        .replace(/^سورة\s+/, '');
      return `سورة ${sName} (كاملة - ${formatNumberEn(ayahsCount)} آية)`;
    }
    const cleanName = mName.startsWith('من سورة')
      ? mName
      : `من سورة ${log.murajaahFromSurahName || mName} إلى سورة ${log.murajaahToSurahName || ''}`;
    return `${cleanName} (${formatNumberEn(ayahsCount)} آية)`;
  }
  const cleanSurah = mName.replace(/^سورة\s+/, '');
  const startAyah = log.murajaahStartAyah || 1;
  const endAyah = log.murajaahEndAyah || 1;
  return `سورة ${cleanSurah} (${formatNumberEn(startAyah)}-${formatNumberEn(endAyah)})`;
}

