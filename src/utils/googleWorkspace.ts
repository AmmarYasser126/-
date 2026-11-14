import {
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import { auth } from './firebase';
import firebaseConfig from '../../firebase-applet-config.json';

export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/documents',
];

const OAUTH_CLIENT_ID =
  firebaseConfig.oAuthClientId ||
  '870871551295-lhgmq4ilv94u6v1g4ifqgr2s1u5o7aot.apps.googleusercontent.com';

export interface GoogleUserInfo {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export interface SheetCreationResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
}

export interface DocCreationResult {
  documentId: string;
  documentUrl: string;
  title: string;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            prompt?: string;
            hint?: string;
            callback: (response: {
              access_token?: string;
              expires_in?: number;
              error?: string;
              error_description?: string;
            }) => void;
            error_callback?: (err: { type?: string; message?: string }) => void;
          }) => {
            requestAccessToken: (overrideConfig?: {
              prompt?: string;
              hint?: string;
            }) => void;
          };
        };
      };
    };
  }
}

const TOKEN_STORAGE_KEY = 'tahfeeth_google_oauth_session_v2';
const LEGACY_TOKEN_STORAGE_KEY = 'tahfeeth_google_oauth_session_v1';

interface StoredOAuthSession {
  accessToken: string;
  expiresAt: number;
  userInfo: GoogleUserInfo;
}

let cachedAccessToken: string | null = null;
let cachedTokenExpiresAt = 0;
let cachedUserInfo: GoogleUserInfo | null = null;
let isSigningIn = false;

function loadStoredSession(): StoredOAuthSession | null {
  try {
    const raw =
      localStorage.getItem(TOKEN_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_TOKEN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredOAuthSession;
    if (
      parsed &&
      parsed.accessToken &&
      typeof parsed.expiresAt === 'number' &&
      Date.now() < parsed.expiresAt
    ) {
      cachedAccessToken = parsed.accessToken;
      cachedTokenExpiresAt = parsed.expiresAt;
      cachedUserInfo = parsed.userInfo || null;
      return parsed;
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

function saveStoredSession(
  accessToken: string,
  expiresInSeconds = 3599,
  userInfo?: GoogleUserInfo | null
) {
  const expiresAt = Date.now() + Math.max(expiresInSeconds - 120, 600) * 1000;
  cachedAccessToken = accessToken;
  cachedTokenExpiresAt = expiresAt;
  if (userInfo) {
    cachedUserInfo = userInfo;
  }
  try {
    const payload: StoredOAuthSession = {
      accessToken,
      expiresAt,
      userInfo: cachedUserInfo || {
        displayName: 'مستخدم Google',
        email: null,
        photoURL: null,
      },
    };
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage errors
  }
}

export function clearStoredSession() {
  cachedAccessToken = null;
  cachedTokenExpiresAt = 0;
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

// Initialize from saved session immediately on module load so user only signs in once
loadStoredSession();

function toUserInfo(user: User): GoogleUserInfo {
  return {
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
  };
}

export const initWorkspaceAuth = (
  onAuthSuccess?: (user: GoogleUserInfo, token: string) => void,
  onAuthFailure?: () => void
) => {
  const existing = loadStoredSession();
  if (existing) {
    onAuthSuccess?.(existing.userInfo, existing.accessToken);
  }

  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      cachedUserInfo = toUserInfo(user);
      const token = getCachedAccessToken();
      if (token) {
        onAuthSuccess?.(cachedUserInfo, token);
      } else if (!isSigningIn) {
        onAuthFailure?.();
      }
    } else {
      const token = getCachedAccessToken();
      if (token && cachedUserInfo) {
        onAuthSuccess?.(cachedUserInfo, token);
      } else if (!isSigningIn) {
        onAuthFailure?.();
      }
    }
  });
};

export const getCachedAccessToken = (): string | null => {
  if (cachedAccessToken && Date.now() < cachedTokenExpiresAt) {
    return cachedAccessToken;
  }
  const stored = loadStoredSession();
  return stored ? stored.accessToken : null;
};

export const getCurrentGoogleUser = (): GoogleUserInfo | null => {
  if (auth.currentUser) {
    return toUserInfo(auth.currentUser);
  }
  if (!cachedUserInfo) {
    loadStoredSession();
  }
  return cachedUserInfo;
};

function ensureGsiScriptLoaded(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.accounts?.oauth2?.initTokenClient) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(
      'script[src*="accounts.google.com/gsi/client"]'
    ) as HTMLScriptElement | null;

    if (existingScript) {
      let elapsed = 0;
      const timer = setInterval(() => {
        elapsed += 50;
        if (window.google?.accounts?.oauth2?.initTokenClient) {
          clearInterval(timer);
          resolve();
        } else if (elapsed >= 8000) {
          clearInterval(timer);
          reject(new Error('تعذر تحميل خدمة تسجيل الدخول من Google.'));
        }
      }, 50);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error('تعذر الاتصال بخدمة حسابات Google.'));
    document.head.appendChild(script);
  });
}

/**
 Preloads the Google Identity Services script and checks any cached token in the background.
 */
export async function preloadGoogleIdentityScript(): Promise<void> {
  ensureGsiScriptLoaded().catch(() => {});
  const session = loadStoredSession();
  if (!session?.accessToken) return;
  try {
    const res = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(
        session.accessToken
      )}`
    );
    if (res.status === 400 || res.status === 401) {
      clearStoredSession();
    }
  } catch {
    // Ignore network errors so valid offline/cached sessions are kept
  }
}

let activeSignInPromise: Promise<{
  user: GoogleUserInfo;
  accessToken: string;
}> | null = null;

function openGsiTokenPopup(
  onTokenReady?: () => void
): Promise<{ user: GoogleUserInfo; accessToken: string }> {
  return new Promise((resolve, reject) => {
    const oauth2 = window.google?.accounts?.oauth2;
    if (!oauth2?.initTokenClient) {
      reject(new Error('خدمة تسجيل الدخول من Google غير جاهزة بعد.'));
      return;
    }

    const hintEmail =
      cachedUserInfo?.email || auth.currentUser?.email || undefined;

    const tokenClient = oauth2.initTokenClient({
      client_id: OAUTH_CLIENT_ID,
      scope: SCOPES.join(' '),
      prompt: '',
      hint: hintEmail,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(
            new Error(
              response.error_description ||
                response.error ||
                'تم إلغاء تسجيل الدخول بحساب Google.'
            )
          );
          return;
        }

        const accessToken = response.access_token;
        const expiresIn = Number(response.expires_in) || 3599;
        const userInfo: GoogleUserInfo = cachedUserInfo || {
          displayName: auth.currentUser?.displayName || 'مستخدم Google',
          email: hintEmail || null,
          photoURL: auth.currentUser?.photoURL || null,
        };

        saveStoredSession(accessToken, expiresIn, userInfo);
        onTokenReady?.();

        resolve({
          user: userInfo,
          accessToken,
        });
      },
      error_callback: (err) => {
        reject(
          new Error(
            err?.message || 'تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.'
          )
        );
      },
    });

    tokenClient.requestAccessToken({
      prompt: '',
      ...(hintEmail ? { hint: hintEmail } : {}),
    });
  });
}

/**
 * Signs in with Google via Google Identity Services OAuth2 Token Client ONLY when no valid cached token exists.
 * Executes synchronously on the click gesture when gsi/client is loaded so the popup is never blocked,
 * and persists the OAuth access token in localStorage so the user only signs in ONCE.
 */
export const signInWithGoogle = (
  onTokenReady?: () => void
): Promise<{
  user: GoogleUserInfo;
  accessToken: string;
}> => {
  const existingToken = getCachedAccessToken();
  if (existingToken) {
    onTokenReady?.();
    return Promise.resolve({
      user: cachedUserInfo || {
        displayName: auth.currentUser?.displayName || 'مستخدم Google',
        email: auth.currentUser?.email || null,
        photoURL: auth.currentUser?.photoURL || null,
      },
      accessToken: existingToken,
    });
  }

  if (activeSignInPromise) {
    return activeSignInPromise.then((res) => {
      onTokenReady?.();
      return res;
    });
  }

  isSigningIn = true;

  // CRITICAL: When gsi/client is already loaded in the page, invoke openGsiTokenPopup()
  // synchronously inside the click stack without any preceding `await` so the browser
  // user activation remains 100% active for the OAuth popup.
  if (window.google?.accounts?.oauth2?.initTokenClient) {
    activeSignInPromise = openGsiTokenPopup(onTokenReady).finally(() => {
      isSigningIn = false;
      activeSignInPromise = null;
    });
    return activeSignInPromise;
  }

  activeSignInPromise = ensureGsiScriptLoaded()
    .then(() => openGsiTokenPopup(onTokenReady))
    .finally(() => {
      isSigningIn = false;
      activeSignInPromise = null;
    });

  return activeSignInPromise;
};

export const signOutGoogle = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch {
    // Ignore
  }
  clearStoredSession();
  cachedUserInfo = null;
};

function ensureValidAccessToken(onTokenReady?: () => void): Promise<string> {
  const validToken = getCachedAccessToken();
  if (validToken) {
    onTokenReady?.();
    return Promise.resolve(validToken);
  }
  return signInWithGoogle(onTokenReady).then((res) => res.accessToken);
}

/**
 * Detects whether the user's device/browser language is Arabic.
 */
export function isArabicDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const primaryLang = (
    navigator.language ||
    (Array.isArray(navigator.languages) && navigator.languages[0]) ||
    ''
  ).toLowerCase();
  return primaryLang.startsWith('ar');
}

/**
 * Creates a formatted Google Sheet in the user's Google account
 * with the Title row + Table headers + Table data rows, formatting, borders,
 * and column widths embedded atomically inside the initial POST request.
 */
export async function createGoogleSheet(
  title: string,
  headers: string[],
  rows: (string | number)[][],
  _subtitle?: string,
  onTokenReady?: () => void
): Promise<SheetCreationResult> {
  let accessToken = await ensureValidAccessToken(onTokenReady);
  const isRtl = isArabicDevice();
  const sheetTitle = isRtl ? 'البيانات' : 'Data';

  const effectiveRows =
    rows && rows.length > 0
      ? rows
      : [['1', 'لا توجد سجلات حالياً', ...Array(Math.max(headers.length - 2, 0)).fill('—')]];

  const numCols = Math.max(headers.length, 1);
  // Row 0 = Title banner, Row 1 = Table headers, Rows 2..N = Data rows
  const totalSheetRows = 2 + effectiveRows.length;

  const serialColIndex = headers.findIndex(
    (h) => h === 'م' || h === '#' || h === 'الرقم'
  );

  const borderStyle = {
    style: 'SOLID',
    width: 1,
    color: { red: 0.8, green: 0.83, blue: 0.85 },
  };

  const cellBorders = {
    top: borderStyle,
    bottom: borderStyle,
    left: borderStyle,
    right: borderStyle,
  };

  const sheetTextDirection = isRtl ? 'RIGHT_TO_LEFT' : 'LEFT_TO_RIGHT';
  const bodyHorizontalAlignment = isRtl ? 'RIGHT' : 'LEFT';

  // Row 0: Title Banner Row (merged across all columns)
  const titleRowData = {
    values: headers.map((_, colIdx) => ({
      userEnteredValue: { stringValue: colIdx === 0 ? String(title ?? '') : '' },
      userEnteredFormat: {
        backgroundColor: { red: 0.024, green: 0.306, blue: 0.231 }, // #064e3b
        horizontalAlignment: 'CENTER',
        verticalAlignment: 'MIDDLE',
        textDirection: sheetTextDirection,
        wrapStrategy: 'WRAP',
        borders: cellBorders,
        textFormat: {
          foregroundColor: { red: 1, green: 1, blue: 1 },
          bold: true,
          fontSize: 13,
        },
      },
    })),
  };

  // Row 1: Table Header Row
  const headerRowData = {
    values: headers.map((h) => ({
      userEnteredValue: { stringValue: String(h ?? '') },
      userEnteredFormat: {
        backgroundColor: { red: 0.024, green: 0.373, blue: 0.275 }, // #065f46
        horizontalAlignment: 'CENTER',
        verticalAlignment: 'MIDDLE',
        textDirection: sheetTextDirection,
        wrapStrategy: 'WRAP',
        borders: cellBorders,
        textFormat: {
          foregroundColor: { red: 1, green: 1, blue: 1 },
          bold: true,
          fontSize: 11,
        },
      },
    })),
  };

  // Rows 2..N: Table Body Rows
  const bodyRowsData = effectiveRows.map((row) => ({
    values: headers.map((_, colIdx) => {
      const cellText = String(row[colIdx] ?? '—');
      const isSerial = colIdx === serialColIndex;
      return {
        userEnteredValue: { stringValue: cellText },
        userEnteredFormat: {
          backgroundColor: isSerial
            ? { red: 0.945, green: 0.96, blue: 0.976 }
            : { red: 1, green: 1, blue: 1 },
          horizontalAlignment: isSerial ? 'CENTER' : bodyHorizontalAlignment,
          verticalAlignment: 'MIDDLE',
          textDirection: sheetTextDirection,
          wrapStrategy: 'WRAP',
          borders: cellBorders,
          textFormat: {
            foregroundColor: { red: 0.11, green: 0.1, blue: 0.09 },
            bold: isSerial,
            fontSize: 10,
          },
        },
      };
    }),
  }));

  // Compute smart column widths in pixels so all text fits cleanly
  const columnMetadata = headers.map((headerText, colIdx) => {
    if (colIdx === serialColIndex) {
      return { pixelSize: 52 };
    }
    let maxLen = String(headerText ?? '').length;
    for (const r of effectiveRows) {
      const len = String(r[colIdx] ?? '').length;
      if (len > maxLen) maxLen = len;
    }
    const computedPx = Math.min(Math.max(maxLen * 9 + 28, 115), 260);
    return { pixelSize: computedPx };
  });

  const rowMetadata = [
    { pixelSize: 44 }, // Title row height
    { pixelSize: 38 }, // Header row height
    ...effectiveRows.map(() => ({ pixelSize: 30 })),
  ];

  const createSpreadsheetRequest = async (token: string) => {
    return fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title,
        },
        sheets: [
          {
            properties: {
              sheetId: 0,
              title: sheetTitle,
              rightToLeft: isRtl,
              gridProperties: {
                rowCount: Math.max(totalSheetRows + 10, 50),
                columnCount: Math.max(numCols + 2, 10),
                frozenRowCount: 2,
              },
            },
            merges:
              numCols > 1
                ? [
                    {
                      sheetId: 0,
                      startRowIndex: 0,
                      endRowIndex: 1,
                      startColumnIndex: 0,
                      endColumnIndex: numCols,
                    },
                  ]
                : [],
            data: [
              {
                startRow: 0,
                startColumn: 0,
                rowData: [titleRowData, headerRowData, ...bodyRowsData],
                rowMetadata,
                columnMetadata,
              },
            ],
          },
        ],
      }),
    });
  };

  let createRes = await createSpreadsheetRequest(accessToken);
  if (createRes.status === 401 || createRes.status === 403) {
    clearStoredSession();
    accessToken = await ensureValidAccessToken();
    createRes = await createSpreadsheetRequest(accessToken);
  }

  if (!createRes.ok) {
    const errData = await createRes.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message || `فشل إنشاء ملف Google Sheets (${createRes.status})`
    );
  }

  const createData = await createRes.json();
  const spreadsheetId: string = createData.spreadsheetId;
  const spreadsheetUrl: string =
    createData.spreadsheetUrl ||
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return {
    spreadsheetId,
    spreadsheetUrl,
    title,
  };
}

/**
 * Creates a formatted Landscape Google Doc in the user's Google account
 * containing the Title heading at the top and the full data table below it,
 * oriented RTL if the device language is Arabic, or LTR if the device language is English.
 */
export async function createGoogleDoc(
  title: string,
  headersOrText: string[] | string,
  rows?: (string | number)[][],
  _subtitle?: string,
  onTokenReady?: () => void
): Promise<DocCreationResult> {
  let accessToken = await ensureValidAccessToken(onTokenReady);
  const isRtl = isArabicDevice();

  const createDocRequest = async (token: string) => {
    return fetch('https://docs.googleapis.com/v1/documents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });
  };

  let createRes = await createDocRequest(accessToken);
  if (createRes.status === 401 || createRes.status === 403) {
    clearStoredSession();
    accessToken = await ensureValidAccessToken();
    createRes = await createDocRequest(accessToken);
  }

  if (!createRes.ok) {
    const errData = await createRes.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message || `فشل إنشاء مستند Google Docs (${createRes.status})`
    );
  }

  const createData = await createRes.json();
  const documentId: string = createData.documentId;
  const documentUrl = `https://docs.google.com/document/d/${documentId}/edit`;

  const hasHeadersArray = Array.isArray(headersOrText) && headersOrText.length > 0;
  const numCols = hasHeadersArray ? headersOrText.length : 1;
  const isWideTable = numCols > 10;

  const effectiveRows: (string | number)[][] =
    hasHeadersArray && Array.isArray(rows) && rows.length > 0
      ? rows
      : hasHeadersArray
      ? [['1', 'لا توجد سجلات حالياً', ...Array(Math.max(headersOrText.length - 2, 0)).fill('—')]]
      : [];

  // Use A3 Landscape (1190.55 x 841.89 PT) for 18-column tables so every column is > 60 PT wide,
  // and A4 Landscape (841.89 x 595.28 PT) for standard tables.
  const pageWidthPt = isWideTable ? 1190.55 : 841.89;
  const pageHeightPt = isWideTable ? 841.89 : 595.28;

  const initialRequests: any[] = [
    {
      updateDocumentStyle: {
        documentStyle: {
          pageSize: {
            width: { magnitude: pageWidthPt, unit: 'PT' },
            height: { magnitude: pageHeightPt, unit: 'PT' },
          },
          marginTop: { magnitude: 22, unit: 'PT' },
          marginBottom: { magnitude: 22, unit: 'PT' },
          marginLeft: { magnitude: 20, unit: 'PT' },
          marginRight: { magnitude: 20, unit: 'PT' },
        },
        fields: 'pageSize,marginTop,marginBottom,marginLeft,marginRight',
      },
    },
  ];

  if (hasHeadersArray) {
    const numRows = effectiveRows.length + 1;
    initialRequests.push({
      insertTable: {
        location: { index: 1 },
        rows: numRows,
        columns: numCols,
      },
    });
  } else {
    const plainBody =
      typeof headersOrText === 'string'
        ? `${title}\n\n${headersOrText}`
        : `${title}\n\nلا توجد سجلات حالياً.`;
    initialRequests.push({
      insertText: {
        location: { index: 1 },
        text: plainBody,
      },
    });
  }

  // Execute Step 1 batchUpdate (page style + table structure at index 1)
  const step1Res = await fetch(
    `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests: initialRequests }),
    }
  );

  if (!step1Res.ok) {
    console.warn('Doc step 1 warning:', await step1Res.text());
  }

  // Step 2: Fetch document structure to get exact cell indices and populate in RTL or LTR order
  if (hasHeadersArray) {
    const headers = headersOrText as string[];
    const orderedHeaders = isRtl ? [...headers].reverse() : [...headers];
    const orderedRows = isRtl
      ? effectiveRows.map((r) => [...r].reverse())
      : effectiveRows.map((r) => [...r]);
    const allGridRows = [orderedHeaders, ...orderedRows];

    const headerFontSize = isWideTable ? 8.5 : 9.5;
    const bodyFontSize = isWideTable ? 8 : 9;
    const paragraphDirection = isRtl ? 'RIGHT_TO_LEFT' : 'LEFT_TO_RIGHT';

    const docRes = await fetch(
      `https://docs.googleapis.com/v1/documents/${documentId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (docRes.ok) {
      const docData = await docRes.json();
      const contentElements: any[] = docData?.body?.content || [];
      const tableElement = contentElements.find((el) => el.table);

      if (tableElement?.table) {
        const tableStartIndex: number = tableElement.startIndex;
        const tableRows: any[] = tableElement.table.tableRows || [];
        const textRequests: any[] = [];

        const cellInsertions: {
          rowIndex: number;
          colIndex: number;
          cellStartIndex: number;
          text: string;
          isHeader: boolean;
          isSerialCol: boolean;
        }[] = [];

        for (let r = 0; r < tableRows.length; r++) {
          const cells: any[] = tableRows[r]?.tableCells || [];
          for (let c = 0; c < cells.length; c++) {
            const cell = cells[c];
            const firstContent = cell?.content?.[0];
            const cellStartIndex: number =
              firstContent?.startIndex ?? cell?.startIndex + 1;
            const rawText = String(allGridRows[r]?.[c] ?? '—').trim() || '—';
            const colHeader = orderedHeaders[c] || '';
            const isSerialCol =
              colHeader === 'م' || colHeader === '#' || colHeader === 'الرقم';

            cellInsertions.push({
              rowIndex: r,
              colIndex: c,
              cellStartIndex,
              text: rawText,
              isHeader: r === 0,
              isSerialCol,
            });
          }
        }

        // Sort strictly in descending order of cellStartIndex so insertions never shift earlier indices
        cellInsertions.sort((a, b) => b.cellStartIndex - a.cellStartIndex);

        for (const item of cellInsertions) {
          textRequests.push(
            {
              insertText: {
                location: { index: item.cellStartIndex },
                text: item.text,
              },
            },
            {
              updateParagraphStyle: {
                range: {
                  startIndex: item.cellStartIndex,
                  endIndex: item.cellStartIndex + item.text.length,
                },
                paragraphStyle: {
                  direction: paragraphDirection,
                  alignment: item.isHeader || item.isSerialCol ? 'CENTER' : 'START',
                },
                fields: 'direction,alignment',
              },
            },
            {
              updateTextStyle: {
                range: {
                  startIndex: item.cellStartIndex,
                  endIndex: item.cellStartIndex + item.text.length,
                },
                textStyle: {
                  bold: item.isHeader || item.isSerialCol,
                  fontSize: {
                    magnitude: item.isHeader ? headerFontSize : bodyFontSize,
                    unit: 'PT',
                  },
                  foregroundColor: {
                    color: {
                      rgbColor: item.isHeader
                        ? { red: 1, green: 1, blue: 1 }
                        : { red: 0.11, green: 0.1, blue: 0.09 },
                    },
                  },
                },
                fields: 'bold,fontSize,foregroundColor',
              },
            }
          );
        }

        // Execute cell text & alignment batch first
        const textBatchRes = await fetch(
          `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ requests: textRequests }),
          }
        );

        if (!textBatchRes.ok) {
          console.warn('Doc cell population warning:', await textBatchRes.text());
        }

        // Execute table cell background & padding styling + insert Title above table at index 1
        const styleRequests: any[] = [
          // Header row emerald background (#065f46)
          {
            updateTableCellStyle: {
              tableRange: {
                tableCellLocation: {
                  tableStartLocation: { index: tableStartIndex },
                  rowIndex: 0,
                  columnIndex: 0,
                },
                rowSpan: 1,
                columnSpan: orderedHeaders.length,
              },
              tableCellStyle: {
                backgroundColor: {
                  color: { rgbColor: { red: 0.024, green: 0.373, blue: 0.275 } },
                },
                paddingTop: { magnitude: 4, unit: 'PT' },
                paddingBottom: { magnitude: 4, unit: 'PT' },
                paddingLeft: { magnitude: 3, unit: 'PT' },
                paddingRight: { magnitude: 3, unit: 'PT' },
              },
              fields:
                'backgroundColor,paddingTop,paddingBottom,paddingLeft,paddingRight',
            },
          },
        ];

        if (tableRows.length > 1) {
          styleRequests.push({
            updateTableCellStyle: {
              tableRange: {
                tableCellLocation: {
                  tableStartLocation: { index: tableStartIndex },
                  rowIndex: 1,
                  columnIndex: 0,
                },
                rowSpan: tableRows.length - 1,
                columnSpan: orderedHeaders.length,
              },
              tableCellStyle: {
                paddingTop: { magnitude: 3, unit: 'PT' },
                paddingBottom: { magnitude: 3, unit: 'PT' },
                paddingLeft: { magnitude: 2.5, unit: 'PT' },
                paddingRight: { magnitude: 2.5, unit: 'PT' },
              },
              fields: 'paddingTop,paddingBottom,paddingLeft,paddingRight',
            },
          });
        }

        // Insert Title heading at index 1 (right above the table, after table styling is queued)
        const cleanTitleText = String(title || '').trim();
        if (cleanTitleText) {
          const titleWithNewline = `${cleanTitleText}\n`;
          styleRequests.push(
            {
              insertText: {
                location: { index: 1 },
                text: titleWithNewline,
              },
            },
            {
              updateParagraphStyle: {
                range: {
                  startIndex: 1,
                  endIndex: 1 + titleWithNewline.length,
                },
                paragraphStyle: {
                  direction: paragraphDirection,
                  alignment: 'CENTER',
                  spaceBelow: { magnitude: 8, unit: 'PT' },
                },
                fields: 'direction,alignment,spaceBelow',
              },
            },
            {
              updateTextStyle: {
                range: {
                  startIndex: 1,
                  endIndex: 1 + cleanTitleText.length,
                },
                textStyle: {
                  bold: true,
                  fontSize: { magnitude: 14, unit: 'PT' },
                  foregroundColor: {
                    color: {
                      rgbColor: { red: 0.024, green: 0.306, blue: 0.231 }, // #064e3b
                    },
                  },
                },
                fields: 'bold,fontSize,foregroundColor',
              },
            }
          );
        }

        await fetch(
          `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ requests: styleRequests }),
          }
        ).catch((err) => console.warn('Doc table cell style warning:', err));
      }
    }
  }

  return {
    documentId,
    documentUrl,
    title,
  };
}
