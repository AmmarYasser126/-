import {
  HalaqahClass,
  TeacherProfile,
  Student,
  SessionLog,
  AttendanceRecord,
} from '../types';
import {
  saveHalaqah,
  saveTeacher,
  saveStudent,
  saveLog,
  saveAttendanceRecords,
  saveSingleAttendance,
  getHalaqat,
  getTeachers,
  getStudents,
  notifyDataChanged,
} from './storage';
import { db } from './firebase';
import { doc, writeBatch, collection } from 'firebase/firestore';

export interface FakeSeedSummary {
  classesCount: number;
  teachersCount: number;
  studentsCount: number;
  logsCount: number;
  attendanceCount: number;
}

export async function populateFakeTestingData(): Promise<FakeSeedSummary> {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Helper to format date offset by days
  const getDateStr = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  // 1. Fake Halaqat (Classes)
  const fakeClasses: HalaqahClass[] = [
    {
      id: 'halaqah_abu_bakr',
      name: 'حلقة أبي بكر الصديق (المستوى المتقدم)',
      teacherName: 'الشيخ عبد الرحمن السديس',
      teacherPhone: '0551122334',
      teacherEmail: 'sudais@jamiwalidayn.org',
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
    {
      id: 'halaqah_umar',
      name: 'حلقة عمر بن الخطاب (المستوى المتوسط)',
      teacherName: 'الشيخ إبراهيم الأخضر',
      teacherPhone: '0552233445',
      teacherEmail: 'akhdar@jamiwalidayn.org',
      createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    },
    {
      id: 'halaqah_uthman',
      name: 'حلقة عثمان بن عفان (المبتدئين والناشئة)',
      teacherName: 'الشيخ ياسر الدوسري',
      teacherPhone: '0553344556',
      teacherEmail: 'dosari@jamiwalidayn.org',
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    },
    {
      id: 'halaqah_ali',
      name: 'حلقة علي بن أبي طالب (الإجازات والمراجعة المكثفة)',
      teacherName: 'الشيخ ماهر المعيقلي',
      teacherPhone: '0554455667',
      teacherEmail: 'muaiqly@jamiwalidayn.org',
      createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    },
  ];

  // 2. Fake Teachers
  const fakeTeachers: TeacherProfile[] = [
    {
      id: 'teacher_sudais',
      name: 'الشيخ عبد الرحمن السديس',
      email: 'sudais@jamiwalidayn.org',
      phoneNumber: '0551122334',
      passwordPin: '05195021',
      halaqahId: 'halaqah_abu_bakr',
      halaqahName: 'حلقة أبي بكر الصديق (المستوى المتقدم)',
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
    {
      id: 'teacher_akhdar',
      name: 'الشيخ إبراهيم الأخضر',
      email: 'akhdar@jamiwalidayn.org',
      phoneNumber: '0552233445',
      passwordPin: '05195021',
      halaqahId: 'halaqah_umar',
      halaqahName: 'حلقة عمر بن الخطاب (المستوى المتوسط)',
      createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    },
    {
      id: 'teacher_dosari',
      name: 'الشيخ ياسر الدوسري',
      email: 'dosari@jamiwalidayn.org',
      phoneNumber: '0553344556',
      passwordPin: '05195021',
      halaqahId: 'halaqah_uthman',
      halaqahName: 'حلقة عثمان بن عفان (المبتدئين والناشئة)',
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    },
    {
      id: 'teacher_muaiqly',
      name: 'الشيخ ماهر المعيقلي',
      email: 'muaiqly@jamiwalidayn.org',
      phoneNumber: '0554455667',
      passwordPin: '05195021',
      halaqahId: 'halaqah_ali',
      halaqahName: 'حلقة علي بن أبي طالب (الإجازات والمراجعة المكثفة)',
      createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    },
  ];

  // 3. Fake Students
  const fakeStudents: Student[] = [
    // Abu Bakr Halaqah (Advanced)
    // Abu Bakr Halaqah (Advanced)
    {
      id: 'student_1',
      fullName: 'عبدالله بن أحمد بن محمد القحطاني',
      email: 'abdullah.q@test.com',
      passwordPin: '12345678',
      rawPhoneNumber: '0501112233',
      registeredAt: new Date(Date.now() - 28 * 86400000).toISOString(),
      currentSurahNumber: 2, // Al-Baqarah
      grade: 'الصف الثالث الثانوي',
      gradeAssignedDate: new Date(Date.now() - 28 * 86400000).toISOString(),
      age: 18,
      ageAssignedDate: new Date(Date.now() - 28 * 86400000).toISOString(),
      halaqahId: 'halaqah_abu_bakr',
      halaqahName: 'حلقة أبي بكر الصديق (المستوى المتقدم)',
    },
    {
      id: 'student_2',
      fullName: 'عمر بن خالد بن فيصل العتيبي',
      email: 'omar.o@test.com',
      passwordPin: '12345678',
      rawPhoneNumber: '0502223344',
      registeredAt: new Date(Date.now() - 26 * 86400000).toISOString(),
      currentSurahNumber: 3, // Al Imran
      grade: 'الصف الثاني الثانوي',
      gradeAssignedDate: new Date(Date.now() - 26 * 86400000).toISOString(),
      age: 17,
      ageAssignedDate: new Date(Date.now() - 26 * 86400000).toISOString(),
      halaqahId: 'halaqah_abu_bakr',
      halaqahName: 'حلقة أبي بكر الصديق (المستوى المتقدم)',
    },
    {
      id: 'student_3',
      fullName: 'سعد بن عبدالعزيز بن صالح الغامدي',
      email: 'saad.g@test.com',
      passwordPin: '12345678',
      rawPhoneNumber: '0503334455',
      registeredAt: new Date(Date.now() - 24 * 86400000).toISOString(),
      currentSurahNumber: 4, // An-Nisa
      grade: 'الصف الأول الثانوي',
      gradeAssignedDate: new Date(Date.now() - 24 * 86400000).toISOString(),
      age: 16,
      ageAssignedDate: new Date(Date.now() - 24 * 86400000).toISOString(),
      halaqahId: 'halaqah_abu_bakr',
      halaqahName: 'حلقة أبي بكر الصديق (المستوى المتقدم)',
    },

    // Umar Halaqah (Intermediate)
    {
      id: 'student_4',
      fullName: 'يوسف بن إبراهيم بن علي الشهري',
      email: 'youssef.s@test.com',
      passwordPin: '12345678',
      rawPhoneNumber: '0504445566',
      registeredAt: new Date(Date.now() - 22 * 86400000).toISOString(),
      currentSurahNumber: 18, // Al-Kahf
      grade: 'الصف الثالث المتوسط',
      gradeAssignedDate: new Date(Date.now() - 22 * 86400000).toISOString(),
      age: 15,
      ageAssignedDate: new Date(Date.now() - 22 * 86400000).toISOString(),
      halaqahId: 'halaqah_umar',
      halaqahName: 'حلقة عمر بن الخطاب (المستوى المتوسط)',
    },
    {
      id: 'student_5',
      fullName: 'حمزة بن طارق بن سلمان الدوسري',
      email: 'hamza.d@test.com',
      passwordPin: '12345678',
      rawPhoneNumber: '0505556677',
      registeredAt: new Date(Date.now() - 20 * 86400000).toISOString(),
      currentSurahNumber: 19, // Maryam
      grade: 'الصف الثاني المتوسط',
      gradeAssignedDate: new Date(Date.now() - 20 * 86400000).toISOString(),
      age: 14,
      ageAssignedDate: new Date(Date.now() - 20 * 86400000).toISOString(),
      halaqahId: 'halaqah_umar',
      halaqahName: 'حلقة عمر بن الخطاب (المستوى المتوسط)',
    },
    {
      id: 'student_6',
      fullName: 'فيصل بن منصور بن ماجد الزهراني',
      email: 'faisal.z@test.com',
      passwordPin: '12345678',
      rawPhoneNumber: '0506667788',
      registeredAt: new Date(Date.now() - 18 * 86400000).toISOString(),
      currentSurahNumber: 36, // Yasin
      grade: 'الصف الأول المتوسط',
      gradeAssignedDate: new Date(Date.now() - 18 * 86400000).toISOString(),
      age: 13,
      ageAssignedDate: new Date(Date.now() - 18 * 86400000).toISOString(),
      halaqahId: 'halaqah_umar',
      halaqahName: 'حلقة عمر بن الخطاب (المستوى المتوسط)',
    },

    // Uthman Halaqah (Beginners & Youth)
    {
      id: 'student_7',
      fullName: 'أنس بن وليد بن سعود الشمري',
      email: 'anas.s@test.com',
      passwordPin: '12345678',
      rawPhoneNumber: '0507778899',
      registeredAt: new Date(Date.now() - 16 * 86400000).toISOString(),
      currentSurahNumber: 78, // An-Naba
      grade: 'الصف السادس الابتدائي',
      gradeAssignedDate: new Date(Date.now() - 16 * 86400000).toISOString(),
      age: 12,
      ageAssignedDate: new Date(Date.now() - 16 * 86400000).toISOString(),
      halaqahId: 'halaqah_uthman',
      halaqahName: 'حلقة عثمان بن عفان (المبتدئين والناشئة)',
    },
    {
      id: 'student_8',
      fullName: 'براء بن فهد بن ناصر المالكي',
      email: 'baraa.m@test.com',
      passwordPin: '12345678',
      rawPhoneNumber: '0508889900',
      registeredAt: new Date(Date.now() - 14 * 86400000).toISOString(),
      currentSurahNumber: 84, // Al-Inshiqaq
      grade: 'الصف الرابع الابتدائي',
      gradeAssignedDate: new Date(Date.now() - 14 * 86400000).toISOString(),
      age: 10,
      ageAssignedDate: new Date(Date.now() - 14 * 86400000).toISOString(),
      halaqahId: 'halaqah_uthman',
      halaqahName: 'حلقة عثمان بن عفان (المبتدئين والناشئة)',
    },
    {
      id: 'student_9',
      fullName: 'ريان بن سلطان بن بدر المطيري',
      email: 'rayan.m@test.com',
      passwordPin: '12345678',
      rawPhoneNumber: '0509990011',
      registeredAt: new Date(Date.now() - 12 * 86400000).toISOString(),
      currentSurahNumber: 90, // Al-Balad
      grade: 'الصف الثاني الابتدائي',
      gradeAssignedDate: new Date(Date.now() - 12 * 86400000).toISOString(),
      age: 8,
      ageAssignedDate: new Date(Date.now() - 12 * 86400000).toISOString(),
      halaqahId: 'halaqah_uthman',
      halaqahName: 'حلقة عثمان بن عفان (المبتدئين والناشئة)',
    },

    // Ali Halaqah (Intensive Review)
    {
      id: 'student_10',
      fullName: 'محمد بن حسان بن عبدالله القرني',
      email: 'mohammed.q@test.com',
      passwordPin: '12345678',
      rawPhoneNumber: '0501234567',
      registeredAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      currentSurahNumber: 1, // Al-Fatihah / Complete
      grade: 'جامعي',
      gradeAssignedDate: new Date(Date.now() - 10 * 86400000).toISOString(),
      age: 23,
      ageAssignedDate: new Date(Date.now() - 10 * 86400000).toISOString(),
      halaqahId: 'halaqah_ali',
      halaqahName: 'حلقة علي بن أبي طالب (الإجازات والمراجعة المكثفة)',
    },
    {
      id: 'student_11',
      fullName: 'زياد بن هشام بن كمال العمري',
      email: 'ziad.o@test.com',
      passwordPin: '12345678',
      rawPhoneNumber: '0502345678',
      registeredAt: new Date(Date.now() - 8 * 86400000).toISOString(),
      currentSurahNumber: 5, // Al-Ma'idah
      grade: 'موظف',
      gradeAssignedDate: new Date(Date.now() - 8 * 86400000).toISOString(),
      age: 34,
      ageAssignedDate: new Date(Date.now() - 8 * 86400000).toISOString(),
      halaqahId: 'halaqah_ali',
      halaqahName: 'حلقة علي بن أبي طالب (الإجازات والمراجعة المكثفة)',
    },
    {
      id: 'student_12',
      fullName: 'خالد بن بسام بن رائد السبيعي',
      email: 'khaled.s@test.com',
      passwordPin: '12345678',
      rawPhoneNumber: '0503456789',
      registeredAt: new Date(Date.now() - 6 * 86400000).toISOString(),
      currentSurahNumber: 6, // Al-An'am
      grade: 'متقاعد',
      gradeAssignedDate: new Date(Date.now() - 6 * 86400000).toISOString(),
      age: 64,
      ageAssignedDate: new Date(Date.now() - 6 * 86400000).toISOString(),
      halaqahId: 'halaqah_ali',
      halaqahName: 'حلقة علي بن أبي طالب (الإجازات والمراجعة المكثفة)',
    },
  ];

  // 4. Fake Session Logs (Rich recitation & review logs across multiple days)
  const fakeLogs: SessionLog[] = [
    // Student 1 (Abdullah - High achiever in Al-Baqarah)
    {
      id: 'log_s1_1',
      studentId: 'student_1',
      studentName: 'عبدالله بن أحمد بن محمد القحطاني',
      type: 'combined',
      surahNumber: 2,
      surahName: 'البقرة',
      startAyah: 1,
      endAyah: 25,
      ayahsCount: 25,
      murajaahSurahNumber: 78,
      murajaahSurahName: 'النبأ',
      murajaahStartAyah: 1,
      murajaahEndAyah: 40,
      murajaahAyahsCount: 40,
      reviewType: 'مراجعة قريبة',
      date: getDateStr(6),
      teacherGrade: 'ممتاز',
      teacherNotes: 'تلاوة متقنة مع مراعاة أحكام التجويد والمدود',
      isConfirmedByTeacher: true,
      parentNotified: true,
      notifiedAt: getDateStr(6) + 'T17:30:00Z',
      createdAt: getDateStr(6) + 'T17:30:00Z',
    },
    {
      id: 'log_s1_2',
      studentId: 'student_1',
      studentName: 'عبدالله بن أحمد بن محمد القحطاني',
      type: 'combined',
      surahNumber: 2,
      surahName: 'البقرة',
      startAyah: 26,
      endAyah: 50,
      ayahsCount: 25,
      murajaahSurahNumber: 79,
      murajaahSurahName: 'النازعات',
      murajaahStartAyah: 1,
      murajaahEndAyah: 46,
      murajaahAyahsCount: 46,
      reviewType: 'مراجعة قريبة',
      date: getDateStr(4),
      teacherGrade: 'ممتاز',
      teacherNotes: 'ما شاء الله تبارك الله، حفظ متين ومخارج حروف واضحة',
      isConfirmedByTeacher: true,
      parentNotified: true,
      notifiedAt: getDateStr(4) + 'T17:40:00Z',
      createdAt: getDateStr(4) + 'T17:40:00Z',
    },
    {
      id: 'log_s1_3',
      studentId: 'student_1',
      studentName: 'عبدالله بن أحمد بن محمد القحطاني',
      type: 'combined',
      surahNumber: 2,
      surahName: 'البقرة',
      startAyah: 51,
      endAyah: 76,
      ayahsCount: 26,
      murajaahSurahNumber: 80,
      murajaahSurahName: 'عبس',
      murajaahStartAyah: 1,
      murajaahEndAyah: 42,
      murajaahAyahsCount: 42,
      reviewType: 'مراجعة قريبة',
      date: getDateStr(1),
      teacherGrade: 'ممتاز',
      teacherNotes: 'أداء متميز وتثبيت ممتاز للآيات',
      isConfirmedByTeacher: true,
      parentNotified: true,
      notifiedAt: getDateStr(1) + 'T17:45:00Z',
      createdAt: getDateStr(1) + 'T17:45:00Z',
    },

    // Student 2 (Omar - Al Imran)
    {
      id: 'log_s2_1',
      studentId: 'student_2',
      studentName: 'عمر بن خالد بن فيصل العتيبي',
      type: 'hifz',
      surahNumber: 3,
      surahName: 'آل عمران',
      startAyah: 1,
      endAyah: 20,
      ayahsCount: 20,
      date: getDateStr(5),
      teacherGrade: 'جيد جدًا',
      teacherNotes: 'حفظ طيب، يحتاج فقط إلى الانتباه للوقف والابتداء في آية 14',
      isConfirmedByTeacher: true,
      parentNotified: true,
      notifiedAt: getDateStr(5) + 'T18:00:00Z',
      createdAt: getDateStr(5) + 'T18:00:00Z',
    },
    {
      id: 'log_s2_2',
      studentId: 'student_2',
      studentName: 'عمر بن خالد بن فيصل العتيبي',
      type: 'combined',
      surahNumber: 3,
      surahName: 'آل عمران',
      startAyah: 21,
      endAyah: 40,
      ayahsCount: 20,
      murajaahSurahNumber: 2,
      murajaahSurahName: 'البقرة',
      murajaahStartAyah: 1,
      murajaahEndAyah: 50,
      murajaahAyahsCount: 50,
      reviewType: 'مراجعة بعيدة',
      date: getDateStr(2),
      teacherGrade: 'ممتاز',
      teacherNotes: 'تحسن ملحوظ ومراجعة قوية لسورة البقرة',
      isConfirmedByTeacher: true,
      parentNotified: true,
      notifiedAt: getDateStr(2) + 'T18:15:00Z',
      createdAt: getDateStr(2) + 'T18:15:00Z',
    },

    // Student 4 (Youssef - Al-Kahf)
    {
      id: 'log_s4_1',
      studentId: 'student_4',
      studentName: 'يوسف بن إبراهيم بن علي الشهري',
      type: 'combined',
      surahNumber: 18,
      surahName: 'الكهف',
      startAyah: 1,
      endAyah: 16,
      ayahsCount: 16,
      murajaahSurahNumber: 17,
      murajaahSurahName: 'الإسراء',
      murajaahStartAyah: 1,
      murajaahEndAyah: 25,
      murajaahAyahsCount: 25,
      reviewType: 'مراجعة قريبة',
      date: getDateStr(4),
      teacherGrade: 'ممتاز',
      teacherNotes: 'حفظ متقن وقراءة حسنة بصوت خاشع',
      isConfirmedByTeacher: true,
      parentNotified: true,
      notifiedAt: getDateStr(4) + 'T17:50:00Z',
      createdAt: getDateStr(4) + 'T17:50:00Z',
    },
    {
      id: 'log_s4_2',
      studentId: 'student_4',
      studentName: 'يوسف بن إبراهيم بن علي الشهري',
      type: 'hifz',
      surahNumber: 18,
      surahName: 'الكهف',
      startAyah: 17,
      endAyah: 31,
      ayahsCount: 15,
      date: getDateStr(2),
      teacherGrade: 'جيد جدًا',
      teacherNotes: 'أحسنت يا يوسف، استمر على هذا الاجتهاد',
      isConfirmedByTeacher: true,
      parentNotified: true,
      notifiedAt: getDateStr(2) + 'T17:55:00Z',
      createdAt: getDateStr(2) + 'T17:55:00Z',
    },

    // Student 7 (Anas - Juz Amma / An-Naba)
    {
      id: 'log_s7_1',
      studentId: 'student_7',
      studentName: 'أنس بن وليد بن سعود الشمري',
      type: 'hifz',
      surahNumber: 78,
      surahName: 'النبأ',
      startAyah: 1,
      endAyah: 20,
      ayahsCount: 20,
      date: getDateStr(5),
      teacherGrade: 'ممتاز',
      teacherNotes: 'بداية مباركة وموفقة في جزء عم، نبرة صوت جميلة',
      isConfirmedByTeacher: true,
      parentNotified: true,
      notifiedAt: getDateStr(5) + 'T16:45:00Z',
      createdAt: getDateStr(5) + 'T16:45:00Z',
    },
    {
      id: 'log_s7_2',
      studentId: 'student_7',
      studentName: 'أنس بن وليد بن سعود الشمري',
      type: 'combined',
      surahNumber: 78,
      surahName: 'النبأ',
      startAyah: 21,
      endAyah: 40,
      ayahsCount: 20,
      murajaahSurahNumber: 114,
      murajaahSurahName: 'الناس',
      murajaahStartAyah: 1,
      murajaahEndAyah: 6,
      murajaahAyahsCount: 6,
      reviewType: 'مراجعة قريبة',
      date: getDateStr(2),
      teacherGrade: 'ممتاز',
      teacherNotes: 'أتم سورة النبأ كاملة بإتقان تام، بارك الله فيه وفي والديه',
      isConfirmedByTeacher: true,
      parentNotified: true,
      notifiedAt: getDateStr(2) + 'T16:50:00Z',
      createdAt: getDateStr(2) + 'T16:50:00Z',
    },

    // Student 10 (Mohammed Al-Qarni - Top Scorer)
    {
      id: 'log_s10_1',
      studentId: 'student_10',
      studentName: 'محمد بن حسان بن عبدالله القرني',
      type: 'combined',
      surahNumber: 1,
      surahName: 'الفاتحة',
      startAyah: 1,
      endAyah: 7,
      ayahsCount: 7,
      murajaahSurahNumber: 2,
      murajaahSurahName: 'البقرة',
      murajaahStartAyah: 1,
      murajaahEndAyah: 100,
      murajaahAyahsCount: 100,
      reviewType: 'مراجعة بعيدة',
      date: getDateStr(3),
      teacherGrade: 'ممتاز',
      teacherNotes: 'مستوى متقدم جداً استعداداً لاختبار خاتمي القرآن',
      isConfirmedByTeacher: true,
      parentNotified: true,
      notifiedAt: getDateStr(3) + 'T18:20:00Z',
      createdAt: getDateStr(3) + 'T18:20:00Z',
    },

    // Student 3 (Saad Al-Ghamdi)
    {
      id: 'log_s3_1',
      studentId: 'student_3',
      studentName: 'سعد بن عبدالعزيز بن صالح الغامدي',
      type: 'combined',
      surahNumber: 4,
      surahName: 'النساء',
      startAyah: 1,
      endAyah: 20,
      ayahsCount: 20,
      murajaahSurahNumber: 3,
      murajaahSurahName: 'آل عمران',
      murajaahStartAyah: 1,
      murajaahEndAyah: 35,
      murajaahAyahsCount: 35,
      reviewType: 'مراجعة قريبة',
      date: getDateStr(3),
      teacherGrade: 'ممتاز',
      teacherNotes: 'تسميع رائع وحفظ متقن',
      isConfirmedByTeacher: true,
      parentNotified: true,
      notifiedAt: getDateStr(3) + 'T17:30:00Z',
      createdAt: getDateStr(3) + 'T17:30:00Z',
    },

    // Student 5 (Hamza Al-Dawsari)
    {
      id: 'log_s5_1',
      studentId: 'student_5',
      studentName: 'حمزة بن طارق بن سلمان الدوسري',
      type: 'combined',
      surahNumber: 19,
      surahName: 'مريم',
      startAyah: 1,
      endAyah: 25,
      ayahsCount: 25,
      murajaahSurahNumber: 18,
      murajaahSurahName: 'الكهف',
      murajaahStartAyah: 1,
      murajaahEndAyah: 30,
      murajaahAyahsCount: 30,
      reviewType: 'مراجعة قريبة',
      date: getDateStr(2),
      teacherGrade: 'ممتاز',
      teacherNotes: 'أداء متميز وتلاوة خاشعة',
      isConfirmedByTeacher: true,
      parentNotified: true,
      notifiedAt: getDateStr(2) + 'T17:40:00Z',
      createdAt: getDateStr(2) + 'T17:40:00Z',
    },

    // Student 6 (Faisal Al-Zahrani)
    {
      id: 'log_s6_1',
      studentId: 'student_6',
      studentName: 'فيصل بن منصور بن ماجد الزهراني',
      type: 'hifz',
      surahNumber: 36,
      surahName: 'يس',
      startAyah: 1,
      endAyah: 30,
      ayahsCount: 30,
      date: getDateStr(4),
      teacherGrade: 'جيد جدًا',
      teacherNotes: 'بداية مباركة في سورة يس',
      isConfirmedByTeacher: true,
      parentNotified: true,
      notifiedAt: getDateStr(4) + 'T17:15:00Z',
      createdAt: getDateStr(4) + 'T17:15:00Z',
    },

    // Student 8 (Baraa Al-Maliki)
    {
      id: 'log_s8_1',
      studentId: 'student_8',
      studentName: 'براء بن فهد بن ناصر المالكي',
      type: 'combined',
      surahNumber: 84,
      surahName: 'الانشقاق',
      startAyah: 1,
      endAyah: 25,
      ayahsCount: 25,
      murajaahSurahNumber: 112,
      murajaahSurahName: 'الإخلاص',
      murajaahStartAyah: 1,
      murajaahEndAyah: 4,
      murajaahAyahsCount: 4,
      reviewType: 'مراجعة قريبة',
      date: getDateStr(2),
      teacherGrade: 'ممتاز',
      teacherNotes: 'تسميع رائع ومتقن لجزء عم',
      isConfirmedByTeacher: true,
      parentNotified: true,
      notifiedAt: getDateStr(2) + 'T16:40:00Z',
      createdAt: getDateStr(2) + 'T16:40:00Z',
    },

    // Student 9 (Rayan Al-Mutairi)
    {
      id: 'log_s9_1',
      studentId: 'student_9',
      studentName: 'ريان بن سلطان بن بدر المطيري',
      type: 'hifz',
      surahNumber: 90,
      surahName: 'البلد',
      startAyah: 1,
      endAyah: 20,
      ayahsCount: 20,
      date: getDateStr(3),
      teacherGrade: 'ممتاز',
      teacherNotes: 'حفظ جميل ومخارج حروف واضحة',
      isConfirmedByTeacher: true,
      parentNotified: true,
      notifiedAt: getDateStr(3) + 'T16:30:00Z',
      createdAt: getDateStr(3) + 'T16:30:00Z',
    },

    // Student 11 (Ziad Al-Omari)
    {
      id: 'log_s11_1',
      studentId: 'student_11',
      studentName: 'زياد بن هشام بن كمال العمري',
      type: 'combined',
      surahNumber: 5,
      surahName: 'المائدة',
      startAyah: 1,
      endAyah: 25,
      ayahsCount: 25,
      murajaahSurahNumber: 4,
      murajaahSurahName: 'النساء',
      murajaahStartAyah: 1,
      murajaahEndAyah: 40,
      murajaahAyahsCount: 40,
      reviewType: 'مراجعة بعيدة',
      date: getDateStr(1),
      teacherGrade: 'ممتاز',
      teacherNotes: 'تسميع رائع وضبط متقن لأحكام التجويد',
      isConfirmedByTeacher: true,
      parentNotified: true,
      notifiedAt: getDateStr(1) + 'T18:10:00Z',
      createdAt: getDateStr(1) + 'T18:10:00Z',
    },

    // Student 12 (Khaled Al-Subaie)
    {
      id: 'log_s12_1',
      studentId: 'student_12',
      studentName: 'خالد بن بسام بن رائد السبيعي',
      type: 'combined',
      surahNumber: 6,
      surahName: 'الأنعام',
      startAyah: 1,
      endAyah: 30,
      ayahsCount: 30,
      murajaahSurahNumber: 5,
      murajaahSurahName: 'المائدة',
      murajaahStartAyah: 1,
      murajaahEndAyah: 35,
      murajaahAyahsCount: 35,
      reviewType: 'مراجعة قريبة',
      date: getDateStr(2),
      teacherGrade: 'ممتاز',
      teacherNotes: 'مستوى متميز وجهد تشكر عليه الأسرة الكريمة',
      isConfirmedByTeacher: true,
      parentNotified: true,
      notifiedAt: getDateStr(2) + 'T18:05:00Z',
      createdAt: getDateStr(2) + 'T18:05:00Z',
    },
  ];

  // 5. Fake Attendance Records (across multiple past days + today)
  const fakeAttendance: AttendanceRecord[] = [];
  const daysToTrack = [0, 1, 2, 3, 4, 5];

  daysToTrack.forEach((d) => {
    const curDate = getDateStr(d);
    fakeStudents.forEach((st, idx) => {
      // Create a realistic mix of mostly present, some absent with excuse, etc.
      let status: 'present' | 'absent' | 'late' | 'excused' = 'present';
      let notes = '';

      if ((idx + d) % 9 === 0) {
        status = 'excused';
        notes = 'عذر مسبق من ولي الأمر';
      } else if ((idx + d) % 13 === 0) {
        status = 'late';
        notes = 'تأخر 15 دقيقة';
      } else if ((idx + d) % 17 === 0) {
        status = 'absent';
        notes = 'غياب بدون عذر';
      }

      fakeAttendance.push({
        id: `att_${st.id}_${curDate}`,
        studentId: st.id,
        studentName: st.fullName,
        halaqahId: st.halaqahId,
        halaqahName: st.halaqahName,
        date: curDate,
        status,
        notes,
        createdAt: curDate + 'T16:00:00Z',
      });
    });
  });

  // Batch Write to Firestore and LocalStorage
  try {
    const batch = writeBatch(db);

    // Save classes
    fakeClasses.forEach((h) => {
      batch.set(doc(db, 'halaqat', h.id), h);
    });

    // Save teachers
    fakeTeachers.forEach((t) => {
      batch.set(doc(db, 'teachers', t.id), t);
    });

    // Save students
    fakeStudents.forEach((s) => {
      batch.set(doc(db, 'students', s.id), s);
    });

    // Save logs with evaluationPoints and totalStars
    const enrichedLogs: SessionLog[] = fakeLogs.map((l) => {
      const isComb = l.type === 'combined';
      const isHifz = l.type === 'hifz' || isComb;
      const isMur = l.type === 'murajaah' || isComb;
      const att = 1;
      const hifz = isHifz ? 2 : 0;
      const mur = isMur ? 1 : 0;
      const disc = 1;
      const attire = 1;
      const total = att + hifz + mur + disc + attire;
      return {
        ...l,
        evaluationPoints: {
          attendance: att,
          hifz: hifz,
          murajaah: mur,
          discipline: disc,
          attire: attire,
          totalPoints: total,
        },
        totalStars: total,
      };
    });

    enrichedLogs.forEach((l) => {
      batch.set(doc(db, 'logs', l.id), l);
    });

    // Save attendance
    fakeAttendance.forEach((a) => {
      batch.set(doc(db, 'attendance', a.id), a);
    });

    await batch.commit();
    console.info('Successfully populated fake data into Firestore cloud database.');
  } catch (e: any) {
    console.warn('Firestore cloud sync notice for fake data (saved to local cache):', e?.message || e);
  }

  // Update localStorage directly for instant UI responsiveness
  const enrichedLogsForLocal: SessionLog[] = fakeLogs.map((l) => {
    const isComb = l.type === 'combined';
    const isHifz = l.type === 'hifz' || isComb;
    const isMur = l.type === 'murajaah' || isComb;
    const att = 1;
    const hifz = isHifz ? 2 : 0;
    const mur = isMur ? 1 : 0;
    const disc = 1;
    const attire = 1;
    const total = att + hifz + mur + disc + attire;
    return {
      ...l,
      evaluationPoints: {
        attendance: att,
        hifz: hifz,
        murajaah: mur,
        discipline: disc,
        attire: attire,
        totalPoints: total,
      },
      totalStars: total,
    };
  });

  localStorage.setItem('jami_walidayn_halaqat_prod_v1', JSON.stringify(fakeClasses));
  localStorage.setItem('jami_walidayn_teachers_prod_v1', JSON.stringify(fakeTeachers));
  localStorage.setItem('jami_walidayn_students_prod_v1', JSON.stringify(fakeStudents));
  localStorage.setItem('jami_walidayn_logs_prod_v1', JSON.stringify(enrichedLogsForLocal));
  localStorage.setItem('jami_walidayn_attendance_prod_v1', JSON.stringify(fakeAttendance));

  notifyDataChanged();

  return {
    classesCount: fakeClasses.length,
    teachersCount: fakeTeachers.length,
    studentsCount: fakeStudents.length,
    logsCount: fakeLogs.length,
    attendanceCount: fakeAttendance.length,
  };
}
