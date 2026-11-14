export type Role = 'student' | 'teacher' | 'admin' | 'parent';

export type JuzColorStatus = 'yellow' | 'blue' | 'green' | 'none';

export type TeacherGrade = 'ممتاز' | 'جيد جدًا' | 'جيد' | 'يحتاج إعادة';

export type ReviewType = 'مراجعة قريبة' | 'مراجعة بعيدة';

export type SessionType = 'hifz' | 'murajaah' | 'combined';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  halaqahId?: string;
  halaqahName?: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  notes?: string;
  createdAt: string;
}

export interface AdminSettings {
  mosqueName: string;
  adminContactPhone: string;
  officialSenderPhone: string;
  defaultPasscode: string;
  customFooterNote?: string;
  activeRecitationDays?: number[]; // [0, 1, 2, 3] for Sun, Mon, Tue, Wed (0=الأحد, 1=الإثنين, 2=الثلاثاء, 3=الأربعاء, 4=الخميس, 5=الجمعة, 6=السبت)
}

export interface ParentProfile {
  phoneNumber: string; // Guardian phone number (unique identifier for parent)
  name?: string;
  passwordPin?: string;
  createdAt: string;
}

export interface HalaqahClass {
  id: string;
  name: string;
  teacherName?: string;
  teacherPhone?: string;
  teacherEmail?: string;
  createdAt: string;
}

export interface TeacherProfile {
  id: string;
  name: string;
  email?: string;
  phoneNumber: string;
  passwordPin?: string;
  halaqahId: string;
  halaqahName: string;
  createdAt: string;
}

export interface Surah {
  number: number;
  name: string;
  englishName: string;
  numberOfAyahs: number;
  revelationType: 'مكية' | 'مدنية';
  startJuz: number;
  endJuz: number;
}

export interface JuzInfo {
  juzNumber: number;
  name: string;
  startSurahNumber: number;
  startSurahName: string;
  startAyah: number;
  endSurahNumber: number;
  endSurahName: string;
  endAyah: number;
  totalAyahs: number;
}

export interface EncryptedData {
  ciphertext: string;
  iv: string;
}

export interface Student {
  id: string;
  fullName: string;
  email?: string;
  passwordPin: string; // 8-digit PIN set by the student
  rawPhoneNumber?: string; // Guardian / Parent phone number
  studentPhone?: string; // Student personal mobile phone (if available)
  grade?: string; // School Grade or Adult Stage (e.g. الصف الأول الابتدائي, جامعي, موظف, متقاعد)
  gradeAssignedDate?: string; // Date when grade was assigned
  age?: number; // Age for adult students (جامعي, موظف, متقاعد)
  ageAssignedDate?: string; // Date when age was assigned for August 1st auto-upgrade
  startSurah?: 'al-nas' | 'al-baqarah'; // Whether student started memorizing from An-Nas (reverse) or Al-Baqarah
  lastSurahStoppedAt?: string; // Reference surah when student enrolled
  lastSurahNumber?: number; // e.g. 67 (Al-Mulk)
  encryptedBirthDate?: EncryptedData;
  encryptedPhoneNumber?: string;
  phoneNumberHash?: string;
  phoneNumberDisplay?: string;
  registeredAt: string;
  currentSurahNumber: number;
  halaqahId?: string;
  halaqahName?: string;
  juzColors?: Record<number, JuzColorStatus>;
}

export interface EvaluationPoints {
  attendance: number; // 0 or 1 - الحضور (نقطة واحدة)
  hifz: number;       // 0 or 2 - الحفظ (نقطتان فقط)
  murajaah: number;   // 0 or 1 - المراجعة (نقطة واحدة)
  discipline: number; // 0 or 1 - الانضباط (نقطة واحدة)
  attire: number;     // 0 or 1 - اللبس (نقطة واحدة)
  totalPoints?: number; // 0 to 6 نجوم
}

export interface SurahInJuzProgress {
  surah: Surah;
  ayahRangeInJuz: {
    start: number;
    end: number;
    count: number;
    isFullSurahInJuz: boolean;
  };
  memorizedAyahsInJuz: number;
  progressPercentageInJuz: number;
  isCompletedInJuz: boolean;
  totalSurahMemorizedAyahs: number;
  totalSurahProgressPercentage: number;
  isEntireSurahCompleted: boolean;
}

export interface SessionLog {
  id: string;
  studentId: string;
  studentName: string;
  type: SessionType; // 'hifz' | 'murajaah' | 'combined'
  surahNumber: number;
  surahName: string;
  startAyah: number;
  endAyah: number;
  ayahsCount: number;
  // Surah Range fields for Hifz ("من سورة إلى سورة")
  isSurahRange?: boolean;
  fromSurahNumber?: number;
  fromSurahName?: string;
  toSurahNumber?: number;
  toSurahName?: string;
  surahsIncluded?: number[];
  // Murajaah section if combined or murajaah
  murajaahSurahNumber?: number;
  murajaahSurahName?: string;
  murajaahStartAyah?: number;
  murajaahEndAyah?: number;
  murajaahAyahsCount?: number;
  // Surah Range fields for Murajaah ("من سورة إلى سورة")
  murajaahIsSurahRange?: boolean;
  murajaahFromSurahNumber?: number;
  murajaahFromSurahName?: string;
  murajaahToSurahNumber?: number;
  murajaahToSurahName?: string;
  murajaahSurahsIncluded?: number[];
  reviewType?: ReviewType;
  date: string;
  teacherGrade?: TeacherGrade;
  teacherNotes?: string;
  evaluationPoints?: EvaluationPoints;
  totalStars?: number; // 0 to 6
  isConfirmedByTeacher?: boolean;
  parentNotified?: boolean;
  notifiedAt?: string;
  createdAt: string;
  // Scoped deletion visibility flags: allows deleting from teacher/admin view without affecting student progress or stars
  hiddenForTeacher?: boolean;
  hiddenForAdmin?: boolean;
  hiddenForStudent?: boolean;
}

export interface StudentStats {
  totalMemorizedAyahs: number;
  totalReviewedAyahs: number;
  memorizedPercentage: number;
  completedAjzaCount: number;
  completedSurahsCount: number;
  currentSurahName: string;
  currentSurahProgress: {
    startAyah: number;
    endAyah: number;
    totalInSurah: number;
  };
  streakDays: number;
  totalStars: number;
  totalAbsents: number;
  totalPresent: number;
}

export interface LeaderboardEntry {
  rank: number;
  studentId: string;
  studentName: string;
  halaqahName: string;
  totalMemorizedAyahs: number;
  memorizedPercentage: number;
  completedAjzaCount: number;
  completedSurahsCount?: number;
  totalReviewedAyahs: number;
  totalStars?: number;
  totalAbsents?: number;
  totalPresent?: number;
  lastSessionDate?: string;
}

export interface AuthSession {
  role: Role;
  student?: Student;
  teacher?: TeacherProfile;
  parent?: ParentProfile;
  parentPhone?: string;
  rememberMe: boolean;
  explicitRemember?: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'student' | 'teacher';
  recipientId: string;
  recipientName: string;
  studentId: string;
  teacherId: string;
  text: string;
  createdAt: string; // ISO string
  read: boolean;
}
