import {
  Student,
  SessionLog,
  StudentStats,
  JuzInfo,
  Surah,
  HalaqahClass,
  TeacherProfile,
  ParentProfile,
  LeaderboardEntry,
  AuthSession,
  AttendanceRecord,
  AdminSettings,
  SurahInJuzProgress,
  JuzColorStatus,
  ChatMessage,
} from '../types';
import { TOTAL_QURAN_AYAHS, JUZ_LIST, SURAHS, getSurahByNumber, getSurahsInJuz } from '../data/quranData';
import { getCurrentWeekClassDates } from './format';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDoc,
  writeBatch,
} from 'firebase/firestore';

export const TEACHER_GLOBAL_PASSWORD = '05195021';
export const ADMIN_GLOBAL_PASSWORD = '36134909';

const STORAGE_KEYS = {
  STUDENTS: 'jami_walidayn_students_prod_v1',
  TEACHERS: 'jami_walidayn_teachers_prod_v1',
  HALAQAT: 'jami_walidayn_halaqat_prod_v1',
  PARENTS: 'jami_walidayn_parents_prod_v1',
  LOGS: 'jami_walidayn_logs_prod_v1',
  ATTENDANCE: 'jami_walidayn_attendance_prod_v1',
  ADMIN_SETTINGS: 'jami_walidayn_admin_settings_prod_v1',
  MESSAGES: 'jami_walidayn_messages_prod_v1',
  AUTH_SESSION: 'jami_walidayn_auth_session_prod_v1',
  INITIALIZED: 'jami_walidayn_prod_clean_init_v2',
};

export const DONATION_IBAN = 'SA5780000110608019911293';
export const DONATION_IBAN_DISPLAY = 'SA 57 80000 110 6080 1991 1293';
export const DONATION_ACCOUNT = '110608019911293';
export const DONATION_ACCOUNT_DISPLAY = '110 6080 1991 1293';
export const OFFICIAL_WHATSAPP_NUMBER = '+966507734083';

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  mosqueName: "جامع الوالدين",
  adminContactPhone: "0507734083",
  officialSenderPhone: "0507734083",
  defaultPasscode: "36134909",
  customFooterNote: "مع تحيات إدارة شؤون الحلقات بجامع الوالدين",
  activeRecitationDays: [0, 1, 2, 3], // 0: الأحد, 1: الإثنين, 2: الثلاثاء, 3: الأربعاء (الخميس والجمعة والسبت إجازة افتراضياً)
};

export interface DayOfWeekOption {
  dayIndex: number;
  arabicName: string;
  shortName: string;
}

export const WEEK_DAYS_OPTIONS: DayOfWeekOption[] = [
  { dayIndex: 0, arabicName: 'الأحد', shortName: 'أحد' },
  { dayIndex: 1, arabicName: 'الإثنين', shortName: 'إثنين' },
  { dayIndex: 2, arabicName: 'الثلاثاء', shortName: 'ثلاثاء' },
  { dayIndex: 3, arabicName: 'الأربعاء', shortName: 'أربعاء' },
  { dayIndex: 4, arabicName: 'الخميس', shortName: 'خميس' },
  { dayIndex: 5, arabicName: 'الجمعة', shortName: 'جمعة' },
  { dayIndex: 6, arabicName: 'السبت', shortName: 'سبت' },
];

export function isRecitationDayToday(settings?: AdminSettings): boolean {
  const adminSettings = settings || getAdminSettings();
  const allowed = adminSettings.activeRecitationDays ?? [0, 1, 2, 3];
  const todayIndex = new Date().getDay(); // 0 is Sunday, 6 is Saturday
  return allowed.includes(todayIndex);
}

export function getRecitationDaysNames(days?: number[]): string {
  const active = days ?? [0, 1, 2, 3];
  return WEEK_DAYS_OPTIONS.filter((d) => active.includes(d.dayIndex))
    .map((d) => d.arabicName)
    .join('، ');
}

// In-Memory Performance Cache to eliminate JSON.parse and heavy recalculation lag
let cachedStudents: Student[] | null = null;
let cachedTeachers: TeacherProfile[] | null = null;
let cachedHalaqat: HalaqahClass[] | null = null;
let cachedLogs: SessionLog[] | null = null;
let cachedAttendance: AttendanceRecord[] | null = null;
let cachedStatsMap = new Map<string, StudentStats>();
let cachedLeaderboard: LeaderboardEntry[] | null = null;

export function invalidateDataCache() {
  cachedStudents = null;
  cachedTeachers = null;
  cachedHalaqat = null;
  cachedLogs = null;
  cachedAttendance = null;
  cachedStatsMap.clear();
  cachedLeaderboard = null;
}

// Cross-tab broadcast channel for instantaneous multi-tab sync across different users
let syncChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    syncChannel = new BroadcastChannel('tahfeeth_realtime_sync');
    syncChannel.onmessage = (event) => {
      if (event.data === 'tahfeeth_data_updated') {
        invalidateDataCache();
        window.dispatchEvent(new CustomEvent('tahfeeth_data_updated'));
      }
    };
  } catch (e) {
    console.warn('BroadcastChannel error:', e);
  }
}

// Event notification helper to notify active React components and other browser tabs
export function notifyDataChanged() {
  invalidateDataCache();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tahfeeth_data_updated'));
    if (syncChannel) {
      try {
        syncChannel.postMessage('tahfeeth_data_updated');
      } catch {
        // ignore
      }
    }
  }
}

// Deep sanitize helper: removes undefined properties so Firestore writes succeed every time
export function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return data;
  return JSON.parse(JSON.stringify(data));
}

// Explicit cloud sync function: fetches live data from Firestore directly across reloads/devices
export async function syncFromFirestore(): Promise<void> {
  try {
    const [
      studentsSnap,
      teachersSnap,
      halaqatSnap,
      parentsSnap,
      logsSnap,
      attendanceSnap,
      settingsSnap,
    ] = await Promise.all([
      getDocs(collection(db, 'students')),
      getDocs(collection(db, 'teachers')),
      getDocs(collection(db, 'halaqat')),
      getDocs(collection(db, 'parents')),
      getDocs(collection(db, 'logs')),
      getDocs(collection(db, 'attendance')),
      getDoc(doc(db, 'adminSettings', 'settings')),
    ]);

    const students: Student[] = [];
    studentsSnap.forEach((d) => students.push(d.data() as Student));
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));

    const teachers: TeacherProfile[] = [];
    teachersSnap.forEach((d) => teachers.push(d.data() as TeacherProfile));
    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));

    const halaqat: HalaqahClass[] = [];
    halaqatSnap.forEach((d) => halaqat.push(d.data() as HalaqahClass));
    localStorage.setItem(STORAGE_KEYS.HALAQAT, JSON.stringify(halaqat));

    const parents: ParentProfile[] = [];
    parentsSnap.forEach((d) => parents.push(d.data() as ParentProfile));
    localStorage.setItem(STORAGE_KEYS.PARENTS, JSON.stringify(parents));

    const logs: SessionLog[] = [];
    logsSnap.forEach((d) => logs.push(d.data() as SessionLog));
    logs.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));

    const attendance: AttendanceRecord[] = [];
    attendanceSnap.forEach((d) => attendance.push(d.data() as AttendanceRecord));
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance));

    if (settingsSnap.exists()) {
      const liveSettings = settingsSnap.data() as AdminSettings;
      localStorage.setItem(STORAGE_KEYS.ADMIN_SETTINGS, JSON.stringify({ ...DEFAULT_ADMIN_SETTINGS, ...liveSettings }));
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'syncFromFirestore');
  }
}

// Subscribe to Firestore for real-time synchronization across devices and browser tabs
let isSubscribed = false;
export function subscribeToFirestore() {
  if (isSubscribed) return;
  isSubscribed = true;

  try {
    // 1. Students collection
    onSnapshot(collection(db, 'students'), (snapshot) => {
      const students: Student[] = [];
      snapshot.forEach((d) => {
        students.push(d.data() as Student);
      });
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
      notifyDataChanged();
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'students'));

    // 2. Teachers collection
    onSnapshot(collection(db, 'teachers'), (snapshot) => {
      const teachers: TeacherProfile[] = [];
      snapshot.forEach((d) => {
        teachers.push(d.data() as TeacherProfile);
      });
      localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
      notifyDataChanged();
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'teachers'));

    // 3. Halaqat collection
    onSnapshot(collection(db, 'halaqat'), (snapshot) => {
      const halaqat: HalaqahClass[] = [];
      snapshot.forEach((d) => {
        halaqat.push(d.data() as HalaqahClass);
      });
      localStorage.setItem(STORAGE_KEYS.HALAQAT, JSON.stringify(halaqat));
      notifyDataChanged();
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'halaqat'));

    // 4. Parents collection
    onSnapshot(collection(db, 'parents'), (snapshot) => {
      const parents: ParentProfile[] = [];
      snapshot.forEach((d) => {
        parents.push(d.data() as ParentProfile);
      });
      localStorage.setItem(STORAGE_KEYS.PARENTS, JSON.stringify(parents));
      notifyDataChanged();
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'parents'));

    // 5. Logs collection
    onSnapshot(collection(db, 'logs'), (snapshot) => {
      const logs: SessionLog[] = [];
      snapshot.forEach((d) => {
        logs.push(d.data() as SessionLog);
      });
      // Sort newest first
      logs.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
      notifyDataChanged();
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'logs'));

    // 6. Attendance collection
    onSnapshot(collection(db, 'attendance'), (snapshot) => {
      const attendance: AttendanceRecord[] = [];
      snapshot.forEach((d) => {
        attendance.push(d.data() as AttendanceRecord);
      });
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance));
      notifyDataChanged();
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'attendance'));

    // 7. Admin settings doc
    onSnapshot(doc(db, 'adminSettings', 'settings'), (docSnap) => {
      if (docSnap.exists()) {
        const settings = docSnap.data() as AdminSettings;
        localStorage.setItem(STORAGE_KEYS.ADMIN_SETTINGS, JSON.stringify({ ...DEFAULT_ADMIN_SETTINGS, ...settings }));
        notifyDataChanged();
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'adminSettings/settings'));

    // 8. Messages collection
    onSnapshot(collection(db, 'messages'), (snapshot) => {
      const messages: ChatMessage[] = [];
      snapshot.forEach((d) => {
        messages.push(d.data() as ChatMessage);
      });
      messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
      notifyDataChanged();
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'messages'));
  } catch (e) {
    console.error('Error establishing Firestore listeners:', e);
  }
}

import { populateFakeTestingData } from './fakeDataGenerator';

// Password validation helpers: Prevent teachers and students from using the same password
export function isPasswordUsedByTeacher(password: string): boolean {
  if (!password) return false;
  const p = password.trim();
  if (p === TEACHER_GLOBAL_PASSWORD) return true;
  const teachers = getTeachers();
  return teachers.some(t => t.passwordPin && t.passwordPin.trim() === p);
}

export function isPasswordUsedByStudent(password: string): boolean {
  if (!password) return false;
  const p = password.trim();
  const students = getStudents();
  return students.some(s => s.passwordPin && s.passwordPin.trim() === p);
}

// Cleanup any legacy test accounts (e.g. demo students, test teachers, test parents)
export function cleanupTestAccounts(): void {
  try {
    // 1. Clean test teachers (e.g. @masjid.org, @jamiwalidayn.org, tch_1, tch_2, tch_3)
    const teachers = getTeachers();
    const cleanTeachers = teachers.filter(t => {
      const email = (t.email || '').toLowerCase();
      const id = t.id || '';
      const name = t.name || '';
      const isTest =
        email.endsWith('@masjid.org') ||
        email.endsWith('@jamiwalidayn.org') ||
        id === 'tch_1' || id === 'tch_2' || id === 'tch_3' ||
        id.startsWith('demo_') || id.startsWith('fake_') ||
        name.includes('تجريبي') || name.includes('تست') || email.includes('test');
      return !isTest;
    });
    if (cleanTeachers.length !== teachers.length) {
      localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(cleanTeachers));
      teachers.forEach(t => {
        if (!cleanTeachers.some(ct => ct.id === t.id)) {
          deleteDoc(doc(db, 'teachers', t.id)).catch(console.error);
        }
      });
    }

    // 2. Clean test students (e.g. @student.jami.org, عمر الفاروق, يوسف الصديق, demo_*, fake_*)
    const students = getStudents();
    const cleanStudents = students.filter(s => {
      const email = (s.email || '').toLowerCase();
      const id = s.id || '';
      const name = s.fullName || '';
      const isTest =
        email.endsWith('@student.jami.org') ||
        email.includes('test') ||
        id.startsWith('demo_') || id.startsWith('fake_') || id.startsWith('test_') ||
        name === 'عمر الفاروق' || name === 'يوسف الصديق' ||
        name.includes('تجريبي') || name.includes('تست');
      return !isTest;
    });
    if (cleanStudents.length !== students.length) {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(cleanStudents));
      students.forEach(s => {
        if (!cleanStudents.some(cs => cs.id === s.id)) {
          deleteDoc(doc(db, 'students', s.id)).catch(console.error);
        }
      });
    }

    // 3. Clean test parents
    const parents = getParents();
    const cleanParents = parents.filter(p => {
      const phone = p.phoneNumber || '';
      return phone !== '0501234567' && phone !== '0559876543';
    });
    if (cleanParents.length !== parents.length) {
      localStorage.setItem(STORAGE_KEYS.PARENTS, JSON.stringify(cleanParents));
      parents.forEach(p => {
        if (!cleanParents.some(cp => cp.phoneNumber === p.phoneNumber)) {
          deleteDoc(doc(db, 'parents', p.phoneNumber)).catch(console.error);
        }
      });
    }

    // 4. Clean fake halaqat
    const halaqat = getHalaqat();
    const cleanHalaqat = halaqat.filter(h => {
      const id = h.id || '';
      return !id.startsWith('halaqah_abu_bakr') && !id.startsWith('halaqah_umar') && !id.startsWith('halaqah_uthman') && !id.startsWith('halaqah_ali');
    });
    if (cleanHalaqat.length !== halaqat.length) {
      localStorage.setItem(STORAGE_KEYS.HALAQAT, JSON.stringify(cleanHalaqat));
      halaqat.forEach(h => {
        if (!cleanHalaqat.some(ch => ch.id === h.id)) {
          deleteDoc(doc(db, 'halaqat', h.id)).catch(console.error);
        }
      });
    }
  } catch (err) {
    console.error('Error during cleanupTestAccounts:', err);
  }
}

// Clean initialization
export async function initializeSeedData(): Promise<void> {
  // Start real-time Firestore listeners for active cross-tab and cross-device sync
  subscribeToFirestore();

  // Clear any legacy test keys if present
  try {
    const legacyKeys = [
      'jami_walidayn_students_v2',
      'jami_walidayn_teachers_v2',
      'jami_walidayn_halaqat_v2',
      'jami_walidayn_logs_v2',
      'jami_walidayn_attendance_v2',
      'jami_walidayn_init_done_v3',
    ];
    legacyKeys.forEach(k => localStorage.removeItem(k));
  } catch (e) {
    console.error('Error clearing legacy keys', e);
  }

  // Fetch all existing live data from Firestore directly (preserves data on reloads, new devices, or cache clear)
  await syncFromFirestore();

  // Set default storage keys if not already initialized
  if (!localStorage.getItem(STORAGE_KEYS.HALAQAT)) localStorage.setItem(STORAGE_KEYS.HALAQAT, JSON.stringify([]));
  if (!localStorage.getItem(STORAGE_KEYS.TEACHERS)) localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify([]));
  if (!localStorage.getItem(STORAGE_KEYS.STUDENTS)) localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify([]));
  if (!localStorage.getItem(STORAGE_KEYS.PARENTS)) localStorage.setItem(STORAGE_KEYS.PARENTS, JSON.stringify([]));
  if (!localStorage.getItem(STORAGE_KEYS.LOGS)) localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify([]));
  if (!localStorage.getItem(STORAGE_KEYS.ATTENDANCE)) localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
  if (!localStorage.getItem(STORAGE_KEYS.ADMIN_SETTINGS)) localStorage.setItem(STORAGE_KEYS.ADMIN_SETTINGS, JSON.stringify(DEFAULT_ADMIN_SETTINGS));
  localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');

  notifyDataChanged();
}

export { populateFakeTestingData };

// Full reset and wipe tool for Admin (clean production state)
export async function clearAllApplicationData(): Promise<void> {
  localStorage.setItem(STORAGE_KEYS.HALAQAT, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.PARENTS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  notifyDataChanged();

  // Wipe from Firestore
  try {
    const collectionsToClear = ['students', 'teachers', 'halaqat', 'logs', 'attendance', 'parents'];
    for (const colName of collectionsToClear) {
      const snap = await getDocs(collection(db, colName));
      const batch = writeBatch(db);
      snap.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (e) {
    console.error('Error clearing Firestore data:', e);
  }
}

// Admin Settings Operations
export function getAdminSettings(): AdminSettings {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ADMIN_SETTINGS);
    return data ? { ...DEFAULT_ADMIN_SETTINGS, ...JSON.parse(data) } : DEFAULT_ADMIN_SETTINGS;
  } catch {
    return DEFAULT_ADMIN_SETTINGS;
  }
}

export function saveAdminSettings(settings: AdminSettings): void {
  const merged = { ...DEFAULT_ADMIN_SETTINGS, ...settings };
  localStorage.setItem(STORAGE_KEYS.ADMIN_SETTINGS, JSON.stringify(merged));
  notifyDataChanged();
  // Sync to Firestore
  setDoc(doc(db, 'adminSettings', 'settings'), cleanForFirestore(merged)).catch((err) =>
    console.error('Firestore saveAdminSettings error:', err)
  );
}

// Halaqat (Classes) Operations
export function getHalaqat(): HalaqahClass[] {
  if (cachedHalaqat !== null) return cachedHalaqat;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.HALAQAT);
    cachedHalaqat = data ? JSON.parse(data) : [];
    return cachedHalaqat;
  } catch (e) {
    console.error('Error fetching halaqat:', e);
    return [];
  }
}

export function saveHalaqah(halaqah: HalaqahClass): void {
  const halaqat = getHalaqat();
  const existingIdx = halaqat.findIndex(h => h.id === halaqah.id);
  if (existingIdx >= 0) {
    halaqat[existingIdx] = halaqah;
  } else {
    halaqat.push(halaqah);
  }
  localStorage.setItem(STORAGE_KEYS.HALAQAT, JSON.stringify(halaqat));
  notifyDataChanged();

  // Sync to Firestore
  setDoc(doc(db, 'halaqat', halaqah.id), cleanForFirestore(halaqah)).catch((err) =>
    console.error('Firestore saveHalaqah error:', err)
  );
}

export function deleteHalaqah(id: string): void {
  const halaqat = getHalaqat().filter(h => h.id !== id);
  localStorage.setItem(STORAGE_KEYS.HALAQAT, JSON.stringify(halaqat));

  // Unassign students from this halaqah
  const students = getStudents().map(s => {
    if (s.halaqahId === id) {
      const updated = { ...s, halaqahId: undefined, halaqahName: undefined };
      setDoc(doc(db, 'students', s.id), cleanForFirestore(updated)).catch(console.error);
      return updated;
    }
    return s;
  });
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  notifyDataChanged();

  // Delete from Firestore
  deleteDoc(doc(db, 'halaqat', id)).catch((err) =>
    console.error('Firestore deleteHalaqah error:', err)
  );
}

// Teachers Operations
export function getTeachers(): TeacherProfile[] {
  if (cachedTeachers !== null) return cachedTeachers;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.TEACHERS);
    let teachers: TeacherProfile[] = data ? JSON.parse(data) : [];
    // Ensure all teachers have the unified teacher password (05195021)
    let needsUpdate = false;
    teachers = teachers.map((t) => {
      if (!t.passwordPin || t.passwordPin !== TEACHER_GLOBAL_PASSWORD) {
        needsUpdate = true;
        return { ...t, passwordPin: TEACHER_GLOBAL_PASSWORD };
      }
      return t;
    });
    if (needsUpdate) {
      localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
      teachers.forEach((t) => {
        setDoc(doc(db, 'teachers', t.id), cleanForFirestore(t)).catch(console.error);
      });
    }
    cachedTeachers = teachers;
    return cachedTeachers;
  } catch (e) {
    console.error('Error fetching teachers:', e);
    return [];
  }
}

export function saveTeacher(teacher: TeacherProfile): void {
  const teacherWithPin: TeacherProfile = {
    ...teacher,
    passwordPin: teacher.passwordPin || TEACHER_GLOBAL_PASSWORD,
  };
  const teachers = getTeachers();
  const existingIdx = teachers.findIndex(t => t.id === teacherWithPin.id);
  if (existingIdx >= 0) {
    teachers[existingIdx] = teacherWithPin;
  } else {
    teachers.push(teacherWithPin);
  }
  localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
  notifyDataChanged();

  // Sync to Firestore
  setDoc(doc(db, 'teachers', teacherWithPin.id), cleanForFirestore(teacherWithPin)).catch((err) =>
    console.error('Firestore saveTeacher error:', err)
  );
}

export function deleteTeacher(id: string): void {
  const teachers = getTeachers().filter(t => t.id !== id);
  localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
  notifyDataChanged();

  // Delete from Firestore
  deleteDoc(doc(db, 'teachers', id)).catch((err) =>
    console.error('Firestore deleteTeacher error:', err)
  );
}

export function findTeacherByEmail(email: string, passwordOrPin?: string): TeacherProfile | null {
  const cleanEmail = email.trim().toLowerCase();
  const teachers = getTeachers();
  const teacher = teachers.find(
    (t) => (t.email && t.email.trim().toLowerCase() === cleanEmail) || t.phoneNumber === email.trim()
  );
  if (!teacher) return null;
  if (passwordOrPin) {
    const cleanPin = passwordOrPin.trim();
    if (cleanPin === TEACHER_GLOBAL_PASSWORD || cleanPin === teacher.passwordPin) {
      return teacher;
    }
    return null;
  }
  return teacher;
}

// Students Operations
export function getStudents(): Student[] {
  if (cachedStudents !== null) return cachedStudents;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    cachedStudents = data ? JSON.parse(data) : [];
    return cachedStudents;
  } catch (e) {
    console.error('Error fetching students:', e);
    return [];
  }
}

export function saveStudent(student: Student): void {
  const students = getStudents();
  const existingIdx = students.findIndex(s => s.id === student.id);
  if (existingIdx >= 0) {
    students[existingIdx] = student;
  } else {
    students.unshift(student);
  }
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  notifyDataChanged();

  // Sync to Firestore
  setDoc(doc(db, 'students', student.id), cleanForFirestore(student)).catch((err) =>
    handleFirestoreError(err, OperationType.WRITE, `students/${student.id}`)
  );
}

export function getStudentJuzColors(studentId: string): Record<number, JuzColorStatus> {
  const student = getStudents().find((s) => s.id === studentId);
  const colors: Record<number, JuzColorStatus> = { ...(student?.juzColors || {}) };
  // When student finishes a juz (reaches 100%), make the color yellow directly if not already set
  if (studentId) {
    const ajza = calculateCompletedAjza(studentId);
    ajza.forEach((j) => {
      if (j.progressPercentage >= 100 && !colors[j.juzNumber]) {
        colors[j.juzNumber] = 'yellow';
      }
    });
  }
  return colors;
}

export function updateStudentJuzColor(
  studentId: string,
  juzNumber: number,
  color: JuzColorStatus | null
): Record<number, JuzColorStatus> {
  const students = getStudents();
  const student = students.find((s) => s.id === studentId);
  if (!student) return {};

  const currentColors: Record<number, JuzColorStatus> = { ...(student.juzColors || {}) };
  // If color is deleted, set to none, or set to yellow, turn it back to yellow
  if (!color || color === 'none' || color === 'yellow') {
    currentColors[juzNumber] = 'yellow';
  } else {
    currentColors[juzNumber] = color;
  }

  student.juzColors = currentColors;
  saveStudent(student);
  return currentColors;
}

export function deleteStudent(studentId: string): void {
  const students = getStudents().filter(s => s.id !== studentId);
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));

  // Clean student logs and attendance locally
  const logs = getLogs().filter(l => l.studentId !== studentId);
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  const attendance = getAttendance().filter(a => a.studentId !== studentId);
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance));
  notifyDataChanged();

  // Delete from Firestore
  deleteDoc(doc(db, 'students', studentId)).catch((err) =>
    console.error('Firestore deleteStudent error:', err)
  );
}

export function findStudentByEmail(email: string, pin: string): Student | null {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPin = pin.trim();
  const students = getStudents();
  return (
    students.find(
      (s) =>
        s.email &&
        s.email.trim().toLowerCase() === cleanEmail &&
        (s.passwordPin === cleanPin || s.passwordPin === '12345678')
    ) || null
  );
}

export function findStudentByPin(pin: string, emailOrQuery?: string): Student | null {
  const cleanPin = pin.trim();
  const students = getStudents();
  if (emailOrQuery && emailOrQuery.trim()) {
    const query = emailOrQuery.trim().toLowerCase();
    const match = students.find(
      (s) =>
        s.passwordPin === cleanPin &&
        ((s.email && s.email.toLowerCase() === query) ||
          s.fullName.toLowerCase().includes(query) ||
          (s.rawPhoneNumber && s.rawPhoneNumber.includes(query)))
    );
    if (match) return match;
  }
  return students.find((s) => s.passwordPin === cleanPin) || null;
}

// Parents Operations
export function getParents(): ParentProfile[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PARENTS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error fetching parents:', e);
    return [];
  }
}

export function saveParent(parent: ParentProfile): void {
  const parents = getParents();
  const existingIdx = parents.findIndex(p => p.phoneNumber.trim() === parent.phoneNumber.trim());
  if (existingIdx >= 0) {
    parents[existingIdx] = parent;
  } else {
    parents.unshift(parent);
  }
  localStorage.setItem(STORAGE_KEYS.PARENTS, JSON.stringify(parents));
  notifyDataChanged();

  // Sync to Firestore
  setDoc(doc(db, 'parents', parent.phoneNumber), cleanForFirestore(parent)).catch((err) =>
    console.error('Firestore saveParent error:', err)
  );
}

export function getStudentsByParentPhone(phone: string): Student[] {
  const cleanPhone = phone.trim();
  const students = getStudents();
  return students.filter(s => {
    if (!s.rawPhoneNumber) return false;
    const sPhone = s.rawPhoneNumber.trim();
    return sPhone === cleanPhone || sPhone.endsWith(cleanPhone) || cleanPhone.endsWith(sPhone);
  });
}

// Retrieves the very first student registered under this parent phone number
export function getFirstStudentForParentPhone(phone: string): Student | null {
  const linked = getStudentsByParentPhone(phone);
  if (linked.length === 0) return null;
  return [...linked].sort((a, b) => {
    const tA = a.registeredAt ? new Date(a.registeredAt).getTime() : 0;
    const tB = b.registeredAt ? new Date(b.registeredAt).getTime() : 0;
    return tA - tB;
  })[0];
}

export function findParentByPhone(phone: string, pin?: string): ParentProfile | null {
  const cleanPhone = phone.trim();
  const parents = getParents();
  const match = parents.find(
    p => p.phoneNumber === cleanPhone || p.phoneNumber.endsWith(cleanPhone) || cleanPhone.endsWith(p.phoneNumber)
  );

  if (match) return match;

  const firstStudent = getFirstStudentForParentPhone(cleanPhone);
  if (firstStudent) {
    return {
      phoneNumber: cleanPhone,
      name: undefined,
      createdAt: firstStudent.registeredAt || new Date().toISOString(),
    };
  }

  return null;
}

// Auth Session Operations (Isolated per device/tab to support multiple simultaneous users/roles)
export function getAuthSession(): AuthSession | null {
  try {
    // Only restore session if the user explicitly clicked "تذكر تسجيل الدخول على هذا الجهاز"
    if (typeof localStorage !== 'undefined') {
      const localData = localStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
      if (localData) {
        const parsed = JSON.parse(localData);
        if (parsed && parsed.rememberMe && parsed.explicitRemember) {
          return parsed;
        } else {
          // Clean up legacy auto-saved session so user opens to the home page
          localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
        }
      }
    }
    // If not explicitly remembered on this device, check sessionStorage only if explicit remember was enabled
    if (typeof sessionStorage !== 'undefined') {
      const sessionData = sessionStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        if (parsed && parsed.rememberMe && parsed.explicitRemember) {
          return parsed;
        } else {
          sessionStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function setAuthSession(session: AuthSession | null): void {
  try {
    if (session) {
      if (session.rememberMe && session.explicitRemember) {
        // User explicitly clicked "تذكر تسجيل الدخول على هذا الجهاز"
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(session));
        }
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(session));
        }
      } else {
        // User did NOT click "تذكر تسجيل الدخول" - ensure storage is cleared so opening app always lands on home page
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
        }
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
        }
      }
    } else {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
      }
    }
  } catch (e) {
    console.error('Error saving auth session:', e);
  }
}

// Logs Operations
export function getLogs(studentId?: string): SessionLog[] {
  let allLogs: SessionLog[];
  if (cachedLogs !== null) {
    allLogs = cachedLogs;
  } else {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LOGS);
      allLogs = data ? JSON.parse(data) : [];
      cachedLogs = allLogs;
    } catch (e) {
      console.error('Error fetching logs:', e);
      allLogs = [];
    }
  }
  if (studentId) {
    return allLogs.filter(l => l.studentId === studentId);
  }
  return allLogs;
}

export function saveLog(log: SessionLog): void {
  const logs = getLogs();
  const existingIdx = logs.findIndex(l => l.id === log.id);
  if (existingIdx >= 0) {
    logs[existingIdx] = log;
  } else {
    logs.unshift(log);
  }
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  notifyDataChanged();

  // Sync to Firestore
  setDoc(doc(db, 'logs', log.id), cleanForFirestore(log)).catch((err) =>
    handleFirestoreError(err, OperationType.WRITE, `logs/${log.id}`)
  );

  // Update student's current Surah and check completed ajza
  const students = getStudents();
  const student = students.find(s => s.id === log.studentId);
  if (student) {
    if (log.type === 'hifz' || log.type === 'combined') {
      const targetSurahNum = (log.isSurahRange && log.toSurahNumber) ? log.toSurahNumber : log.surahNumber;
      if (targetSurahNum) {
        student.currentSurahNumber = targetSurahNum;
      }
    }
    // When student finishes a juz, make the color yellow directly!
    const ajza = calculateCompletedAjza(student.id);
    let changed = false;
    const currentColors = { ...(student.juzColors || {}) };
    ajza.forEach(j => {
      if (j.progressPercentage >= 100 && currentColors[j.juzNumber] === undefined) {
        currentColors[j.juzNumber] = 'yellow';
        changed = true;
      }
    });
    if (changed) {
      student.juzColors = currentColors;
    }
    saveStudent(student);
  }

  // Automatic deletion/reset when reaching 99 for all students and teachers
  checkAndApplyAutoResetAt99(log.studentId);
}

/**
 * Automatically checks and deletes recitation logs when reaching 99 for any student or teacher.
 * If student's logs reach >= 99, it automatically deletes them and resets to 0.
 * If teacher's class logs or session counter reach >= 99, it automatically deletes them and resets to 0.
 */
export function checkAndApplyAutoResetAt99(targetStudentId?: string): void {
  const allLogs = getLogs();
  const students = getStudents();
  const teachers = getTeachers();

  let logsChanged = false;
  let remainingLogs = [...allLogs];

  // 1. Check for specific student or all students
  const studentsToCheck = targetStudentId
    ? students.filter((s) => s.id === targetStudentId)
    : students;

  for (const st of studentsToCheck) {
    const studentLogs = remainingLogs.filter((l) => l.studentId === st.id);
    if (studentLogs.length >= 99) {
      // Auto-delete this student's logs when reaching 99
      remainingLogs = remainingLogs.filter((l) => l.studentId !== st.id);
      logsChanged = true;
      // Delete from Firestore
      studentLogs.forEach((l) => {
        deleteDoc(doc(db, 'logs', l.id)).catch((err) =>
          console.error('Firestore auto delete student log at 99 error:', err)
        );
      });
    }
  }

  // 2. Check for teachers and their halaqat
  for (const t of teachers) {
    const classStudentIds = new Set(
      students
        .filter((s) => (t.halaqahId && s.halaqahId === t.halaqahId) || (t.halaqahName && s.halaqahName === t.halaqahName))
        .map((s) => s.id)
    );
    const classLogs = remainingLogs.filter((l) => classStudentIds.has(l.studentId));
    const storageKey = `teacher_recorded_sessions_${t.id}`;
    const savedCount = parseInt(localStorage.getItem(storageKey) || '0', 10);

    if (classLogs.length >= 99 || savedCount >= 99) {
      // Auto-delete this teacher's class logs when reaching 99
      remainingLogs = remainingLogs.filter((l) => !classStudentIds.has(l.studentId));
      logsChanged = true;
      try {
        localStorage.setItem(storageKey, '0');
      } catch (e) {
        console.error('Error resetting teacher counter:', e);
      }
      classLogs.forEach((l) => {
        deleteDoc(doc(db, 'logs', l.id)).catch((err) =>
          console.error('Firestore auto delete class log at 99 error:', err)
        );
      });
    }
  }

  if (logsChanged) {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(remainingLogs));
    cachedLogs = remainingLogs;
    notifyDataChanged();
  }
}

export function deleteLog(logId: string, role: 'student' | 'teacher' | 'admin' | 'parent' = 'student'): void {
  // Admin and teacher can not delete logs individually; only one master button in settings deletes it all
  if (role === 'teacher' || role === 'admin') {
    return;
  }
  const allLogs = getLogs();
  const target = allLogs.find(l => l.id === logId);
  if (!target) return;

  // Student deletes their own log
  const updated = allLogs.filter(l => l.id !== logId);
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(updated));
  notifyDataChanged();
  deleteDoc(doc(db, 'logs', logId)).catch(err =>
    console.error('Firestore deleteLog error:', err)
  );
}

export function clearAllLogsForRole(role: 'teacher' | 'admin' | 'student', halaqahId?: string): void {
  const allLogs = getLogs();
  const students = getStudents();
  
  let updated: SessionLog[];

  if (role === 'teacher') {
    // Hide from teacher view only; NEVER delete for the students!
    updated = allLogs.map(log => {
      if (halaqahId) {
        const student = students.find(s => s.id === log.studentId);
        if (student?.halaqahId === halaqahId) {
          return { ...log, hiddenForTeacher: true };
        }
        return log;
      }
      return { ...log, hiddenForTeacher: true };
    });
  } else if (role === 'admin') {
    // Hide from admin public view only; NEVER delete for the students!
    updated = allLogs.map(log => ({ ...log, hiddenForAdmin: true }));
  } else {
    updated = allLogs;
  }

  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(updated));
  notifyDataChanged();

  // Sync to Firestore without deleting from students
  getDocs(collection(db, 'logs')).then(snapshot => {
    const batch = writeBatch(db);
    snapshot.forEach(d => {
      const log = d.data() as SessionLog;
      if (role === 'teacher') {
        if (halaqahId) {
          const student = students.find(s => s.id === log.studentId);
          if (student?.halaqahId !== halaqahId) return;
        }
        batch.update(d.ref, { hiddenForTeacher: true });
      } else if (role === 'admin') {
        batch.update(d.ref, { hiddenForAdmin: true });
      }
    });
    return batch.commit();
  }).catch(err => console.error('Firestore clearAllLogsForRole error:', err));
}

export function deleteStudentLogs(studentId: string, role: 'student' | 'teacher' | 'admin' = 'student'): void {
  // Only the student is allowed to delete their recitation logs
  if (role !== 'student') {
    return;
  }
  const allLogs = getLogs();
  const updated = allLogs.filter(l => l.studentId !== studentId);
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(updated));
  notifyDataChanged();

  getDocs(collection(db, 'logs')).then(snapshot => {
    const batch = writeBatch(db);
    snapshot.forEach(d => {
      const data = d.data() as SessionLog;
      if (data.studentId === studentId) {
        batch.delete(d.ref);
      }
    });
    return batch.commit();
  }).catch(err => console.error('Firestore deleteStudentLogs error:', err));
}

export async function clearAllLogs(): Promise<void> {
  // Clear all logs completely from localStorage and local cache
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify([]));
  cachedLogs = [];

  // Reset teacher recorded sessions counter
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('teacher_recorded_sessions_')) {
        localStorage.removeItem(key);
      }
    }
  } catch (e) {
    console.error('Error clearing teacher recorded sessions keys:', e);
  }
  notifyDataChanged();

  // Completely delete all documents from the Firestore 'logs' collection
  try {
    const snapshot = await getDocs(collection(db, 'logs'));
    const docs = snapshot.docs;
    const CHUNK_SIZE = 400;
    for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
      const chunk = docs.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const d of chunk) {
        batch.delete(d.ref);
      }
      await batch.commit();
    }
  } catch (err) {
    console.error('Firestore clearAllLogs error:', err);
  }
}

/**
 * Allows a teacher to delete all recitation logs for their own class with one single button.
 */
export async function clearTeacherClassLogs(
  halaqahId?: string,
  halaqahName?: string,
  teacherId?: string
): Promise<void> {
  const students = getStudents();
  const classStudents = students.filter(
    (s) => (halaqahId && s.halaqahId === halaqahId) || (halaqahName && s.halaqahName === halaqahName)
  );
  const classStudentIds = new Set(classStudents.map((s) => s.id));

  const allLogs = getLogs();
  const logsToDelete = allLogs.filter((l) => classStudentIds.has(l.studentId));
  const remainingLogs = allLogs.filter((l) => !classStudentIds.has(l.studentId));

  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(remainingLogs));
  cachedLogs = remainingLogs;

  if (teacherId) {
    try {
      localStorage.removeItem(`teacher_recorded_sessions_${teacherId}`);
    } catch (e) {
      console.error('Error clearing teacher counter:', e);
    }
  }
  notifyDataChanged();

  // Batch delete the class's logs from Firestore
  try {
    const CHUNK_SIZE = 400;
    for (let i = 0; i < logsToDelete.length; i += CHUNK_SIZE) {
      const chunk = logsToDelete.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const log of chunk) {
        batch.delete(doc(db, 'logs', log.id));
      }
      await batch.commit();
    }
  } catch (err) {
    console.error('Firestore clearTeacherClassLogs error:', err);
  }
}

export async function clearAllStars(): Promise<void> {
  const allLogs = getLogs();
  const updatedLogs = allLogs.map(l => ({
    ...l,
    totalStars: 0,
    evaluationPoints: {
      attendance: 0,
      hifz: 0,
      murajaah: 0,
      discipline: 0,
      attire: 0,
      totalPoints: 0,
    },
  }));

  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(updatedLogs));
  notifyDataChanged();

  try {
    const snapshot = await getDocs(collection(db, 'logs'));
    let batch = writeBatch(db);
    let count = 0;
    for (const d of snapshot.docs) {
      batch.update(d.ref, {
        totalStars: 0,
        'evaluationPoints.totalPoints': 0,
        'evaluationPoints.attendance': 0,
        'evaluationPoints.hifz': 0,
        'evaluationPoints.murajaah': 0,
        'evaluationPoints.discipline': 0,
        'evaluationPoints.attire': 0,
      });
      count++;
      if (count >= 400) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }
    if (count > 0) {
      await batch.commit();
    }
  } catch (err) {
    console.error('Firestore clearAllStars error:', err);
  }
}

// Attendance (تحضير الطلاب) Operations
export function getAttendance(date?: string, halaqahId?: string, studentId?: string): AttendanceRecord[] {
  let records: AttendanceRecord[];
  if (cachedAttendance !== null) {
    records = cachedAttendance;
  } else {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      records = data ? JSON.parse(data) : [];
      cachedAttendance = records;
    } catch (e) {
      console.error('Error fetching attendance:', e);
      records = [];
    }
  }
  if (date) {
    records = records.filter(r => r.date === date);
  }
  if (halaqahId) {
    records = records.filter(r => r.halaqahId === halaqahId);
  }
  if (studentId) {
    records = records.filter(r => r.studentId === studentId);
  }
  return records;
}

export function saveAttendanceRecords(records: AttendanceRecord[]): void {
  const existingRecords = getAttendance();
  const recordMap = new Map<string, AttendanceRecord>();
  
  existingRecords.forEach(r => recordMap.set(`${r.studentId}_${r.date}`, r));
  records.forEach(r => recordMap.set(`${r.studentId}_${r.date}`, r));

  const updated = Array.from(recordMap.values());
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(updated));
  notifyDataChanged();

  // Sync each record to Firestore
  records.forEach((record) => {
    setDoc(doc(db, 'attendance', record.id), cleanForFirestore(record)).catch((err) =>
      console.error('Firestore saveAttendance error:', err)
    );
  });
}

export function saveSingleAttendance(record: AttendanceRecord): void {
  saveAttendanceRecords([record]);
}

export function deleteAttendanceRecord(id: string): void {
  const records = getAttendance().filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));
  notifyDataChanged();

  deleteDoc(doc(db, 'attendance', id)).catch((err) =>
    console.error('Firestore deleteAttendance error:', err)
  );
}

// Returns current monthly key format "YYYY-MM" (e.g. "2026-10")
export function getCurrentAttendanceMonthKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getStudentAttendanceSummary(studentId: string, monthKey?: string): {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
  monthKey: string;
} {
  // Weekly tracking: calculate strictly for the 4 class days (Sun-Wed) of the current week so it resets weekly
  const weekDates = getCurrentWeekClassDates();
  const allRecords = getAttendance(undefined, undefined, studentId);
  const records = allRecords.filter(r => r.date && weekDates.includes(r.date));
  const total = records.length;
  if (total === 0) {
    return { total: 0, present: 0, absent: 0, late: 0, excused: 0, percentage: 100, monthKey: weekDates[0] || '' };
  }
  const present = records.filter(r => r.status === 'present').length;
  const late = records.filter(r => r.status === 'late').length;
  const excused = records.filter(r => r.status === 'excused').length;
  const absent = records.filter(r => r.status === 'absent').length;

  const attendedScore = present + late * 0.75 + excused * 1.0;
  const percentage = Math.min(100, Math.round((attendedScore / total) * 100));

  return { total, present, absent, late, excused, percentage, monthKey: weekDates[0] || '' };
}

/**
 * Calculates total present and absent counts strictly for the 4 class days (Sun-Wed)
 * of the current week for a halaqah and its students.
 */
export function calculateWeeklyHalaqahAttendance(
  studentIds: string[],
  halaqahId?: string
): { present: number; absent: number } {
  const weekDates = getCurrentWeekClassDates();
  const allAttendance = getAttendance();
  const studentSet = new Set(studentIds);

  const weekRecords = allAttendance.filter((r) => {
    const belongsToClass = (halaqahId && r.halaqahId === halaqahId) || studentSet.has(r.studentId);
    return belongsToClass && weekDates.includes(r.date);
  });

  let present = 0;
  let absent = 0;

  for (const r of weekRecords) {
    if (r.status === 'present' || r.status === 'late') {
      present++;
    } else if (r.status === 'absent' || r.status === 'excused') {
      absent++;
    }
  }

  return { present, absent };
}

// HELPER: Determine if a specific Surah & Ayah is inside a given Juz
function isAyahInJuz(surahNum: number, ayahNum: number, juz: JuzInfo): boolean {
  if (surahNum < juz.startSurahNumber || surahNum > juz.endSurahNumber) {
    return false;
  }
  if (surahNum === juz.startSurahNumber && ayahNum < juz.startAyah) {
    return false;
  }
  if (surahNum === juz.endSurahNumber && ayahNum > juz.endAyah) {
    return false;
  }
  return true;
}

// HELPER: Baseline Quran memorization based on starting surah (An-Nas vs Al-Baqarah) and last surah reached
function populateBaselineMemorizedAyahs(student: Student | undefined, set: Set<string>): void {
  if (!student) return;
  const startSurah = student.startSurah || 'al-nas';
  const lastSurahNum = student.lastSurahNumber ?? (student.currentSurahNumber ? student.currentSurahNumber : 114);

  if (startSurah === 'al-nas') {
    // Starting from Surah An-Nas (114) and moving backwards (114, 113, ..., 68, 67 Al-Mulk)
    // When student is at Surah Al-Mulk (67), everything before it from An-Nas (Surahs 114 down to 68) is memorized!
    SURAHS.forEach((s) => {
      if (s.number > lastSurahNum && s.number <= 114) {
        for (let a = 1; a <= s.numberOfAyahs; a++) {
          set.add(`${s.number}:${a}`);
        }
      }
    });
  } else if (startSurah === 'al-baqarah') {
    // Starting from Surah Al-Baqarah (2) and moving forward (1, 2, 3, 4, ...)
    // Everything before the stopped surah is memorized
    SURAHS.forEach((s) => {
      if (s.number < lastSurahNum) {
        for (let a = 1; a <= s.numberOfAyahs; a++) {
          set.add(`${s.number}:${a}`);
        }
      }
    });
  }
}

// HELPER: Build set of unique memorized ayahs ("surahNum:ayahNum") for a student
export function getStudentMemorizedVersesSet(studentId: string): Set<string> {
  const student = getStudents().find((s) => s.id === studentId);
  const logs = getLogs(studentId);
  const set = new Set<string>();

  // 1. Populate baseline memorization
  populateBaselineMemorizedAyahs(student, set);

  // 2. Add logged session ayahs
  logs.forEach((l) => {
    if (l.type === 'hifz' || l.type === 'combined') {
      if (l.isSurahRange && l.surahsIncluded && l.surahsIncluded.length > 0) {
        l.surahsIncluded.forEach((sNum) => {
          const sObj = getSurahByNumber(sNum);
          if (sObj) {
            for (let a = 1; a <= sObj.numberOfAyahs; a++) {
              set.add(`${sNum}:${a}`);
            }
          }
        });
      } else {
        const sNum = l.surahNumber;
        const start = Math.min(l.startAyah, l.endAyah);
        const end = Math.max(l.startAyah, l.endAyah);
        for (let a = start; a <= end; a++) {
          set.add(`${sNum}:${a}`);
        }
      }
    }
  });

  return set;
}

// Calculate completed Surahs (Surahs where all ayahs are fully memorized)
export function calculateCompletedSurahs(studentId: string): { completedCount: number; completedSurahs: Surah[] } {
  const memorizedVersesSet = getStudentMemorizedVersesSet(studentId);
  const completedSurahs: Surah[] = [];

  for (const surah of SURAHS) {
    let isEntirelyMemorized = true;
    for (let a = 1; a <= surah.numberOfAyahs; a++) {
      if (!memorizedVersesSet.has(`${surah.number}:${a}`)) {
        isEntirelyMemorized = false;
        break;
      }
    }
    if (isEntirelyMemorized) {
      completedSurahs.push(surah);
    }
  }

  return {
    completedCount: completedSurahs.length,
    completedSurahs,
  };
}

// Stats & Leaderboard: Accurate Unique Verse Count (Prevents double counting repeated ayahs)
export function calculateStudentStats(studentId: string): StudentStats {
  if (cachedStatsMap.has(studentId)) {
    return cachedStatsMap.get(studentId)!;
  }

  const student = getStudents().find((s) => s.id === studentId);
  const logs = getLogs(studentId);

  // Set of unique memorized ayahs in format "surahNum:ayahNum"
  const memorizedVersesSet = getStudentMemorizedVersesSet(studentId);
  let totalReviewedAyahs = 0;

  // Tally reviewed ayahs
  logs.forEach(l => {
    if (l.type === 'murajaah') {
      totalReviewedAyahs += l.ayahsCount || 0;
    } else if (l.type === 'combined') {
      totalReviewedAyahs += l.murajaahAyahsCount || 0;
    }
  });

  const totalMemorizedAyahs = memorizedVersesSet.size;
  const memorizedPercentage = Math.min(
    100,
    Number(((totalMemorizedAyahs / TOTAL_QURAN_AYAHS) * 100).toFixed(2))
  );

  const hifzAndCombinedLogs = logs.filter(l => l.type === 'hifz' || l.type === 'combined');
  const latestHifz = hifzAndCombinedLogs.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];
  const loggedSurah = latestHifz ? getSurahByNumber(latestHifz.toSurahNumber || latestHifz.surahNumber) : null;
  const currentSurah =
    loggedSurah ||
    (student?.lastSurahNumber ? getSurahByNumber(student.lastSurahNumber) : null) ||
    (student?.currentSurahNumber ? getSurahByNumber(student.currentSurahNumber) : null);

  const currentSurahProgress = latestHifz
    ? {
        startAyah: latestHifz.startAyah,
        endAyah: latestHifz.endAyah,
        totalInSurah: currentSurah?.numberOfAyahs || 7,
      }
    : {
        startAyah: 1,
        endAyah: 1,
        totalInSurah: currentSurah?.numberOfAyahs || 7,
      };

  const completedAjza = calculateCompletedAjza(studentId);
  const completedSurahsResult = calculateCompletedSurahs(studentId);
  const streakDays = calculateStreak(logs);

  // Calculate total stars accumulated across all sessions
  const totalStars = logs.reduce((sum, l) => {
    if (typeof l.totalStars === 'number') {
      return sum + l.totalStars;
    }
    if (l.evaluationPoints) {
      const p = l.evaluationPoints;
      return sum + (p.totalPoints ?? ((p.attendance || 0) + (p.hifz || 0) + (p.murajaah || 0) + (p.discipline || 0) + (p.attire || 0)));
    }
    return sum;
  }, 0);

  // Calculate attendance summary
  const attendanceSummary = getStudentAttendanceSummary(studentId);
  const totalAbsents = attendanceSummary.absent;
  const totalPresent = attendanceSummary.present;

  const currentSurahName = latestHifz?.isSurahRange
    ? latestHifz.surahName
    : currentSurah
    ? `سورة ${currentSurah.name}`
    : student?.lastSurahStoppedAt || 'لا يوجد موضع تسميع موثق بعد';

  const statsResult: StudentStats = {
    totalMemorizedAyahs,
    totalReviewedAyahs,
    memorizedPercentage,
    completedAjzaCount: completedAjza.filter(j => j.progressPercentage >= 100).length,
    completedSurahsCount: completedSurahsResult.completedCount,
    currentSurahName,
    currentSurahProgress,
    streakDays,
    totalStars,
    totalAbsents,
    totalPresent,
  };

  cachedStatsMap.set(studentId, statsResult);
  return statsResult;
}

export interface JuzProgress {
  juzNumber: number;
  juzInfo: JuzInfo;
  memorizedAyahs: number;
  reviewedAyahs: number;
  progressPercentage: number;
  status: 'completed' | 'in_progress' | 'not_started';
}

export function calculateCompletedAjza(studentId: string): JuzProgress[] {
  const logs = getLogs(studentId);
  const memorizedVersesSet = getStudentMemorizedVersesSet(studentId);

  return JUZ_LIST.map((juz) => {
    // Count how many unique memorized verses fall inside this Juz
    let memInJuz = 0;
    memorizedVersesSet.forEach((key) => {
      const [sNum, aNum] = key.split(':').map(Number);
      if (isAyahInJuz(sNum, aNum, juz)) {
        memInJuz++;
      }
    });

    // Calculate review ayahs in this juz
    let revInJuz = 0;
    logs.forEach((log) => {
      if (log.type === 'murajaah') {
        if (log.murajaahIsSurahRange && log.murajaahSurahsIncluded && log.murajaahSurahsIncluded.length > 0) {
          log.murajaahSurahsIncluded.forEach((sNum) => {
            const s = getSurahByNumber(sNum);
            if (s && s.startJuz <= juz.juzNumber && s.endJuz >= juz.juzNumber) {
              revInJuz += s.numberOfAyahs;
            }
          });
        } else {
          const s = getSurahByNumber(log.surahNumber);
          if (s && s.startJuz <= juz.juzNumber && s.endJuz >= juz.juzNumber) {
            revInJuz += log.ayahsCount || 0;
          }
        }
      } else if (log.type === 'combined') {
        if (log.murajaahIsSurahRange && log.murajaahSurahsIncluded && log.murajaahSurahsIncluded.length > 0) {
          log.murajaahSurahsIncluded.forEach((sNum) => {
            const s = getSurahByNumber(sNum);
            if (s && s.startJuz <= juz.juzNumber && s.endJuz >= juz.juzNumber) {
              revInJuz += s.numberOfAyahs;
            }
          });
        } else if (log.murajaahSurahNumber) {
          const s = getSurahByNumber(log.murajaahSurahNumber);
          if (s && s.startJuz <= juz.juzNumber && s.endJuz >= juz.juzNumber) {
            revInJuz += log.murajaahAyahsCount || 0;
          }
        }
      }
    });

    const pct = Math.min(100, Math.round((memInJuz / juz.totalAyahs) * 100));

    let status: 'completed' | 'in_progress' | 'not_started' = 'not_started';
    if (pct >= 100) status = 'completed';
    else if (pct > 0) status = 'in_progress';

    return {
      juzNumber: juz.juzNumber,
      juzInfo: juz,
      memorizedAyahs: Math.min(juz.totalAyahs, memInJuz),
      reviewedAyahs: revInJuz,
      progressPercentage: pct,
      status,
    };
  });
}

// Granular per-surah breakdown inside a specific Juz for a student
export function calculateSurahsProgressInJuz(studentId: string, juz: JuzInfo): SurahInJuzProgress[] {
  const memorizedVersesSet = getStudentMemorizedVersesSet(studentId);
  const surahsInJuz = getSurahsInJuz(juz.juzNumber);

  return surahsInJuz.map((surah) => {
    let startAyahInJuz = 0;
    let endAyahInJuz = 0;
    let totalAyahsInJuz = 0;
    let memorizedAyahsInJuz = 0;

    for (let a = 1; a <= surah.numberOfAyahs; a++) {
      if (isAyahInJuz(surah.number, a, juz)) {
        if (startAyahInJuz === 0) startAyahInJuz = a;
        endAyahInJuz = a;
        totalAyahsInJuz++;
        if (memorizedVersesSet.has(`${surah.number}:${a}`)) {
          memorizedAyahsInJuz++;
        }
      }
    }

    const isFullSurahInJuz = startAyahInJuz === 1 && endAyahInJuz === surah.numberOfAyahs;
    const progressPercentageInJuz =
      totalAyahsInJuz > 0 ? Math.min(100, Math.round((memorizedAyahsInJuz / totalAyahsInJuz) * 100)) : 0;
    const isCompletedInJuz = totalAyahsInJuz > 0 && memorizedAyahsInJuz >= totalAyahsInJuz;

    // Whole Surah calculation across entire Quran
    let totalSurahMemorizedAyahs = 0;
    for (let a = 1; a <= surah.numberOfAyahs; a++) {
      if (memorizedVersesSet.has(`${surah.number}:${a}`)) {
        totalSurahMemorizedAyahs++;
      }
    }
    const totalSurahProgressPercentage = Math.min(
      100,
      Math.round((totalSurahMemorizedAyahs / surah.numberOfAyahs) * 100)
    );
    const isEntireSurahCompleted = totalSurahMemorizedAyahs >= surah.numberOfAyahs;

    return {
      surah,
      ayahRangeInJuz: {
        start: startAyahInJuz,
        end: endAyahInJuz,
        count: totalAyahsInJuz,
        isFullSurahInJuz,
      },
      memorizedAyahsInJuz,
      progressPercentageInJuz,
      isCompletedInJuz,
      totalSurahMemorizedAyahs,
      totalSurahProgressPercentage,
      isEntireSurahCompleted,
    };
  });
}

function calculateStreak(logs: SessionLog[]): number {
  if (!logs.length) return 0;
  const uniqueDates = Array.from(new Set(logs.map(l => l.date))).sort().reverse();
  if (!uniqueDates.length) return 0;

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  let streak = 0;
  let checkDate = uniqueDates[0] === todayStr ? todayStr : (uniqueDates[0] === yesterday ? yesterday : null);

  if (!checkDate) return 0;

  let curr = new Date(checkDate);
  while (true) {
    const formatted = curr.toISOString().split('T')[0];
    if (uniqueDates.includes(formatted)) {
      streak++;
      curr.setDate(curr.getDate() - 1);
      if (streak > 365) break;
    } else {
      break;
    }
  }

  return streak;
}

export function getLeaderboard(): LeaderboardEntry[] {
  if (cachedLeaderboard !== null) return cachedLeaderboard;
  const students = getStudents();
  const entries: LeaderboardEntry[] = students.map(student => {
    const stats = calculateStudentStats(student.id);
    const logs = getLogs(student.id);
    const lastSession = logs.length > 0 ? logs[0].date : undefined;

    return {
      rank: 0,
      studentId: student.id,
      studentName: student.fullName,
      halaqahName: student.halaqahName || 'حلقة عامة',
      totalMemorizedAyahs: stats.totalMemorizedAyahs,
      memorizedPercentage: stats.memorizedPercentage,
      completedAjzaCount: stats.completedAjzaCount,
      completedSurahsCount: stats.completedSurahsCount,
      totalReviewedAyahs: stats.totalReviewedAyahs,
      totalStars: stats.totalStars,
      totalAbsents: stats.totalAbsents,
      totalPresent: stats.totalPresent,
      lastSessionDate: lastSession,
    };
  });

  // Sort by total memorized ayahs descending, then reviewed
  entries.sort((a, b) => {
    if (b.totalMemorizedAyahs !== a.totalMemorizedAyahs) {
      return b.totalMemorizedAyahs - a.totalMemorizedAyahs;
    }
    return b.totalReviewedAyahs - a.totalReviewedAyahs;
  });

  // Assign ranks
  const ranked = entries.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
  cachedLeaderboard = ranked;
  return ranked;
}

// Visual Chart & Growth Analytics Helpers
export interface HalaqahStatsSummary {
  halaqahId: string;
  halaqahName: string;
  teacherName: string;
  teacherPhone: string;
  studentCount: number;
  totalMemorizedAyahs: number;
  totalReviewedAyahs: number;
  avgMemorizedPercentage: number;
}

export interface ClassDetailedAnalytics {
  halaqahId: string;
  halaqahName: string;
  teacherName: string;
  studentCount: number;
  totalMemorizedAyahs: number;
  totalReviewedAyahs: number;
  totalAyahs: number;
  avgMemorizedPercentage: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  attendanceRate: number;
}

export function getAllHalaqatStats(): HalaqahStatsSummary[] {
  const halaqat = getHalaqat();
  const students = getStudents();

  return halaqat.map(h => {
    const halaqahStudents = students.filter(s => s.halaqahId === h.id || s.halaqahName === h.name);
    let totalMem = 0;
    let totalRev = 0;
    let sumPercentage = 0;

    halaqahStudents.forEach(s => {
      const stats = calculateStudentStats(s.id);
      totalMem += stats.totalMemorizedAyahs;
      totalRev += stats.totalReviewedAyahs;
      sumPercentage += stats.memorizedPercentage;
    });

    const avgMemorizedPercentage = halaqahStudents.length > 0 
      ? Number((sumPercentage / halaqahStudents.length).toFixed(1))
      : 0;

    return {
      halaqahId: h.id,
      halaqahName: h.name,
      teacherName: h.teacherName || 'غير محدد',
      teacherPhone: h.teacherPhone || '',
      studentCount: halaqahStudents.length,
      totalMemorizedAyahs: totalMem,
      totalReviewedAyahs: totalRev,
      avgMemorizedPercentage,
    };
  });
}

export function getAllClassesDetailedAnalytics(): ClassDetailedAnalytics[] {
  const halaqat = getHalaqat();
  const students = getStudents();
  const allAttendance = getAttendance();

  return halaqat.map(h => {
    const halaqahStudents = students.filter(s => s.halaqahId === h.id || s.halaqahName === h.name);
    const studentIds = new Set(halaqahStudents.map(s => s.id));

    let totalMem = 0;
    let totalRev = 0;
    let sumPercentage = 0;

    halaqahStudents.forEach(s => {
      const stats = calculateStudentStats(s.id);
      totalMem += stats.totalMemorizedAyahs;
      totalRev += stats.totalReviewedAyahs;
      sumPercentage += stats.memorizedPercentage;
    });

    const avgMemorizedPercentage = halaqahStudents.length > 0
      ? Number((sumPercentage / halaqahStudents.length).toFixed(1))
      : 0;

    // Calculate attendance records for this class
    const classAttendance = allAttendance.filter(
      a => studentIds.has(a.studentId) || a.halaqahId === h.id || a.halaqahName === h.name
    );

    const presentCount = classAttendance.filter(a => a.status === 'present').length;
    const lateCount = classAttendance.filter(a => a.status === 'late').length;
    const excusedCount = classAttendance.filter(a => a.status === 'excused').length;
    const absentCount = classAttendance.filter(a => a.status === 'absent').length;

    const totalAttendanceEntries = classAttendance.length;
    const attendanceRate = totalAttendanceEntries > 0
      ? Math.round(((presentCount + lateCount * 0.75 + excusedCount) / totalAttendanceEntries) * 100)
      : (halaqahStudents.length > 0 ? 100 : 0);

    return {
      halaqahId: h.id,
      halaqahName: h.name,
      teacherName: h.teacherName || 'غير محدد',
      studentCount: halaqahStudents.length,
      totalMemorizedAyahs: totalMem,
      totalReviewedAyahs: totalRev,
      totalAyahs: totalMem + totalRev,
      avgMemorizedPercentage,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      attendanceRate,
    };
  });
}

export interface GrowthTimelinePoint {
  date: string;
  displayDate: string;
  memorized: number; // الحفظ اليومي (آيات)
  reviewed: number; // المراجعة (آيات)
  cumulativeMemorized: number; // التراكمي
  presentCount: number; // الحضور (عدد الطلاب)
  absentCount: number; // الغياب (عدد الطلاب)
}

export function getMemorizationGrowthTimeline(halaqahId?: string, studentId?: string): GrowthTimelinePoint[] {
  let logs = getLogs(studentId);
  const students = getStudents();
  let attendanceRecords = getAttendance();

  if (studentId) {
    attendanceRecords = attendanceRecords.filter(a => a.studentId === studentId);
  } else if (halaqahId) {
    const halaqahStudentIds = new Set(
      students
        .filter(s => s.halaqahId === halaqahId || s.halaqahName === halaqahId)
        .map(s => s.id)
    );
    logs = logs.filter(l => halaqahStudentIds.has(l.studentId));
    attendanceRecords = attendanceRecords.filter(
      a => halaqahStudentIds.has(a.studentId) || a.halaqahId === halaqahId
    );
  }

  // Collect all unique dates from logs and attendance
  const dateMap: {
    [date: string]: {
      memorized: number;
      reviewed: number;
      present: number;
      absent: number;
    };
  } = {};

  logs.forEach(l => {
    const d = l.date || l.createdAt.split('T')[0];
    if (!dateMap[d]) {
      dateMap[d] = { memorized: 0, reviewed: 0, present: 0, absent: 0 };
    }
    if (l.type === 'hifz') {
      dateMap[d].memorized += l.ayahsCount || 0;
    } else if (l.type === 'murajaah') {
      dateMap[d].reviewed += l.ayahsCount || 0;
    } else if (l.type === 'combined') {
      dateMap[d].memorized += l.ayahsCount || 0;
      dateMap[d].reviewed += l.murajaahAyahsCount || 0;
    }
  });

  attendanceRecords.forEach(att => {
    const d = att.date;
    if (!dateMap[d]) {
      dateMap[d] = { memorized: 0, reviewed: 0, present: 0, absent: 0 };
    }
    if (att.status === 'present' || att.status === 'late') {
      dateMap[d].present += 1;
    } else if (att.status === 'absent') {
      dateMap[d].absent += 1;
    }
  });

  if (Object.keys(dateMap).length === 0) {
    return [];
  }

  const sortedDates = Object.keys(dateMap).sort();
  let cumulative = 0;

  return sortedDates.map(date => {
    const item = dateMap[date];
    cumulative += item.memorized;
    const dateObj = new Date(date);
    const displayDate = dateObj.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });

    return {
      date,
      displayDate,
      memorized: item.memorized,
      reviewed: item.reviewed,
      cumulativeMemorized: cumulative,
      presentCount: item.present,
      absentCount: item.absent,
    };
  });
}

// -------------------------------------------------------------
// Chat System Operations (Student <-> Teacher Messaging)
// -------------------------------------------------------------

export function getMessages(): ChatMessage[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error fetching messages:', e);
    return [];
  }
}

export function getStudentTeacher(studentId: string): TeacherProfile | null {
  const students = getStudents();
  const student = students.find((s) => s.id === studentId);
  if (!student) return null;

  const halaqat = getHalaqat();
  const teachers = getTeachers();

  // 1. Match by student halaqahId
  if (student.halaqahId) {
    const teacher = teachers.find((t) => t.halaqahId === student.halaqahId);
    if (teacher) return teacher;

    const halaqah = halaqat.find((h) => h.id === student.halaqahId);
    if (halaqah && halaqah.teacherName) {
      const tByName = teachers.find((t) => t.name.trim() === halaqah.teacherName?.trim());
      if (tByName) return tByName;
    }
  }

  // 2. Match by student halaqahName
  if (student.halaqahName) {
    const teacher = teachers.find(
      (t) => t.halaqahName && t.halaqahName.trim() === student.halaqahName?.trim()
    );
    if (teacher) return teacher;

    const halaqah = halaqat.find((h) => h.name && h.name.trim() === student.halaqahName?.trim());
    if (halaqah && halaqah.teacherName) {
      const tByName = teachers.find((t) => t.name.trim() === halaqah.teacherName?.trim());
      if (tByName) return tByName;
    }
  }

  // 3. Fallback: if only one teacher exists
  if (teachers.length === 1) return teachers[0];

  return null;
}

export function getConversation(studentId: string, teacherId: string): ChatMessage[] {
  const allMessages = getMessages();
  return allMessages
    .filter((m) => m.studentId === studentId && m.teacherId === teacherId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function sendChatMessage(params: {
  senderId: string;
  senderName: string;
  senderRole: 'student' | 'teacher';
  recipientId: string;
  recipientName: string;
  studentId: string;
  teacherId: string;
  text: string;
}): ChatMessage {
  const messages = getMessages();
  const newMsg: ChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    ...params,
    createdAt: new Date().toISOString(),
    read: false,
  };

  messages.push(newMsg);
  localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
  notifyDataChanged();

  // Sync to Firestore
  setDoc(doc(db, 'messages', newMsg.id), cleanForFirestore(newMsg)).catch((err) =>
    console.error('Firestore sendChatMessage error:', err)
  );

  return newMsg;
}

export function markConversationAsRead(
  studentId: string,
  teacherId: string,
  readerRole: 'student' | 'teacher'
): void {
  const messages = getMessages();
  let hasUpdates = false;

  const updatedMessages = messages.map((msg) => {
    if (
      msg.studentId === studentId &&
      (!teacherId || msg.teacherId === teacherId) &&
      !msg.read
    ) {
      if (
        (readerRole === 'teacher' && msg.senderRole === 'student') ||
        (readerRole === 'student' && msg.senderRole === 'teacher')
      ) {
        hasUpdates = true;
        const updated = { ...msg, read: true };
        setDoc(doc(db, 'messages', msg.id), cleanForFirestore(updated)).catch(console.error);
        return updated;
      }
    }
    return msg;
  });

  if (hasUpdates) {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(updatedMessages));
    notifyDataChanged();
  }
}

export function getUnreadMessagesCount(userId: string, role: 'student' | 'teacher'): number {
  const messages = getMessages();
  return messages.filter((msg) => {
    if (msg.read) return false;
    if (role === 'student') {
      return msg.studentId === userId && msg.senderRole === 'teacher';
    } else {
      return msg.teacherId === userId && msg.senderRole === 'student';
    }
  }).length;
}

export function getUnreadCountPerStudent(teacherId: string): Record<string, number> {
  const messages = getMessages();
  const counts: Record<string, number> = {};
  messages.forEach((msg) => {
    if (!msg.read && msg.teacherId === teacherId && msg.senderRole === 'student') {
      counts[msg.studentId] = (counts[msg.studentId] || 0) + 1;
    }
  });
  return counts;
}

export function deleteChatMessage(messageId: string): void {
  const messages = getMessages();
  const updated = messages.filter((m) => m.id !== messageId);
  localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(updated));
  notifyDataChanged();
  deleteDoc(doc(db, 'messages', messageId)).catch((err) =>
    console.error('Firestore deleteChatMessage error:', err)
  );
}

export function clearConversation(studentId: string, teacherId: string): void {
  const messages = getMessages();
  const toDelete = messages.filter(
    (m) => m.studentId === studentId && m.teacherId === teacherId
  );
  const updated = messages.filter(
    (m) => !(m.studentId === studentId && m.teacherId === teacherId)
  );
  localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(updated));
  notifyDataChanged();

  toDelete.forEach((msg) => {
    deleteDoc(doc(db, 'messages', msg.id)).catch((err) =>
      console.error('Firestore clearConversation error:', err)
    );
  });
}
