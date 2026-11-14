import React, { useState, useMemo } from 'react';
import {
  Student,
  TeacherProfile,
  HalaqahClass,
  SessionLog,
  SessionType,
  AdminSettings,
  TeacherGrade,
  AttendanceRecord,
} from '../types';
import {
  getHalaqat,
  saveHalaqah,
  deleteHalaqah,
  getTeachers,
  saveTeacher,
  deleteTeacher,
  getStudents,
  saveStudent,
  deleteStudent,
  getLogs,
  getAttendance,
  saveLog,
  clearAllStars,
  clearAllLogs,
  calculateStudentStats,
  calculateCompletedAjza,
  calculateWeeklyHalaqahAttendance,
  getAdminSettings,
  saveAdminSettings,
  clearAllApplicationData,
  isPasswordUsedByTeacher,
  TEACHER_GLOBAL_PASSWORD,
  WEEK_DAYS_OPTIONS,
  getRecitationDaysNames,
} from '../utils/storage';
import { QURAN_JUZS, SURAH_LIST } from '../data/quranData';
import { GRADES_LIST, isAdultStage } from '../utils/gradeHelper';
import { scoreArabicNameSearch } from '../utils/arabicSearch';
import { LeaderboardView } from './LeaderboardView';
import { TahfeethDataView } from './TahfeethDataView';
import { HalaqahDetailModal } from './HalaqahDetailModal';
import { AttendanceManager } from './AttendanceManager';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { StudentProfileModal } from './StudentProfileModal';
import { TeacherProfileModal } from './TeacherProfileModal';
import { ExportModal, ExportType } from './ExportModal';
import { SessionStarsBadge } from './SessionStarsBadge';
import { GrowthChart } from './GrowthChart';
import { populateFakeTestingData } from '../utils/fakeDataGenerator';
import { formatDateEn, formatNumberEn, toEnglishDigits } from '../utils/format';
import { validateSaudiMobile } from '../utils/smsService';
import {
  Shield,
  School,
  Users,
  GraduationCap,
  FileCheck,
  PlusCircle,
  Edit2,
  Trash2,
  CheckCircle2,
  Search,
  KeyRound,
  Send,
  BookOpen,
  RotateCcw,
  Trophy,
  Phone,
  BarChart3,
  TrendingUp,
  UserCheck,
  Settings,
  Eye,
  Layers,
  FileSpreadsheet,
  Sparkles,
  Download,
  ArrowUpDown,
  SlidersHorizontal,
  Award,
  UploadCloud,
  Mail,
  Star,
  StarOff,
  MessageCircle,
  X,
  Calendar,
} from 'lucide-react';

interface AdminDashboardProps {
  students: Student[];
  allLogs: SessionLog[];
  onOpenLogModal: (student: Student, type?: SessionType) => void;
  onOpenParentMessage?: (student: Student, log: SessionLog) => void;
  onRefresh: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  students,
  allLogs,
  onOpenLogModal,
  onOpenParentMessage,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<
    'classes' | 'attendance' | 'growth' | 'teachers' | 'students' | 'logs' | 'settings' | 'leaderboard' | 'tahfeethData'
  >('classes');

  // Halaqat state
  const halaqat = getHalaqat();
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<HalaqahClass | null>(null);
  const [classNameInput, setClassNameInput] = useState('');
  const [classTeacherInput, setClassTeacherInput] = useState('');
  const [selectedDrillHalaqah, setSelectedDrillHalaqah] = useState<HalaqahClass | null>(null);
  const [selectedAttendanceHalaqah, setSelectedAttendanceHalaqah] = useState<HalaqahClass | null>(null);

  // Active visible logs for Admin (filters out soft-deleted logs so counter resets to 0 when deleted)
  const visibleLogs = useMemo(() => allLogs.filter((l) => !l.hiddenForAdmin), [allLogs]);

  // Teachers state
  const teachers = getTeachers();
  const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherProfile | null>(null);
  const [tNameInput, setTNameInput] = useState('');
  const [tPhoneInput, setTPhoneInput] = useState('');
  const [tEmailInput, setTEmailInput] = useState('');
  const [tPinInput, setTPinInput] = useState('');
  const [tHalaqahInput, setTHalaqahInput] = useState('');

  // Students state
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [sNameInput, setSNameInput] = useState('');
  const [sEmailInput, setSEmailInput] = useState('');
  const [sPhoneInput, setSPhoneInput] = useState('');
  const [sStudentPhoneInput, setSStudentPhoneInput] = useState('');
  const [sHalaqahInput, setSHalaqahInput] = useState('');
  const [sPinInput, setSPinInput] = useState('');
  const [sGradeInput, setSGradeInput] = useState<string>(GRADES_LIST[0]);
  const [sAgeInput, setSAgeInput] = useState<string>('');
  const [sStartSurahInput, setSStartSurahInput] = useState<'al-nas' | 'al-baqarah'>('al-nas');
  const [sLastSurahNumberInput, setSLastSurahNumberInput] = useState<number>(67);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentSort, setStudentSort] = useState<'az' | 'za' | 'most_memorized' | 'least_memorized' | 'most_surahs' | 'newest' | 'oldest'>('az');
  const [studentJuzFilter, setStudentJuzFilter] = useState<string>('all');
  const [studentHalaqahFilter, setStudentHalaqahFilter] = useState<string>('all');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportModalType, setExportModalType] = useState<ExportType>('students');
  const [exportSelectedHalaqah, setExportSelectedHalaqah] = useState<HalaqahClass | null>(null);
  const [exportSelectedTeacher, setExportSelectedTeacher] = useState<TeacherProfile | null>(null);
  const [exportSelectedStudent, setExportSelectedStudent] = useState<Student | null>(null);
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);
  const [selectedTeacherForProfile, setSelectedTeacherForProfile] = useState<TeacherProfile | null>(null);

  // Surahs lists ordered by starting point
  const surahsFromAnNas = useMemo(() => {
    return [...SURAH_LIST].reverse();
  }, []);

  const surahsFromAlBaqarah = useMemo(() => {
    return SURAH_LIST;
  }, []);

  // Settings state
  const [adminSettings, setAdminSettingsState] = useState<AdminSettings>(getAdminSettings());
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Edit Log State for Admin
  const [editingLog, setEditingLog] = useState<SessionLog | null>(null);
  const [editLogGrade, setEditLogGrade] = useState<TeacherGrade>('ممتاز');
  const [editLogNotes, setEditLogNotes] = useState<string>('');
  const [editLogStartAyah, setEditLogStartAyah] = useState<number>(1);
  const [editLogEndAyah, setEditLogEndAyah] = useState<number>(10);
  const [editLogDate, setEditLogDate] = useState<string>('');

  // Delete modal state
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    type: 'class' | 'teacher' | 'student' | 'wipe_all' | 'wipe_all_stars' | 'wipe_all_logs';
    id: string;
    name: string;
  }>({
    isOpen: false,
    type: 'class',
    id: '',
    name: '',
  });

  const [settingsActionSuccess, setSettingsActionSuccess] = useState<string | null>(null);

  // --- Handlers for Classes ---
  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!classNameInput.trim()) return;

    const halaqah: HalaqahClass = {
      id: editingClass ? editingClass.id : `halaqah_${Date.now()}`,
      name: classNameInput.trim(),
      teacherName: classTeacherInput.trim() || undefined,
      createdAt: editingClass ? editingClass.createdAt : new Date().toISOString(),
    };

    saveHalaqah(halaqah);
    setIsAddClassOpen(false);
    setEditingClass(null);
    setClassNameInput('');
    setClassTeacherInput('');
    onRefresh();
  };

  // --- Handlers for Teachers ---
  const handleSaveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tNameInput.trim() || !tPhoneInput.trim()) return;

    const teacherPhoneVal = validateSaudiMobile(tPhoneInput);
    if (!teacherPhoneVal.isValid) {
      alert(teacherPhoneVal.error || 'رقم جوال المعلم غير صحيح: يجب أن يتكون من 10 أرقام ويبدأ بـ 05');
      return;
    }

    const teacher: TeacherProfile = {
      id: editingTeacher ? editingTeacher.id : `teacher_${Date.now()}`,
      name: tNameInput.trim(),
      phoneNumber: teacherPhoneVal.formattedLocal,
      email: tEmailInput.trim() ? tEmailInput.trim().toLowerCase() : undefined,
      passwordPin: tPinInput.trim() || TEACHER_GLOBAL_PASSWORD,
      halaqahId: editingTeacher?.halaqahId || 'custom_' + Date.now(),
      halaqahName: tHalaqahInput.trim() || 'حلقة عامة',
      createdAt: editingTeacher ? editingTeacher.createdAt : new Date().toISOString(),
    };

    saveTeacher(teacher);
    setIsAddTeacherOpen(false);
    setEditingTeacher(null);
    setTNameInput('');
    setTPhoneInput('');
    setTEmailInput('');
    setTPinInput('');
    setTHalaqahInput('');
    onRefresh();
  };

  // --- Handlers for Students ---
  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sNameInput.trim() || !sEmailInput.trim() || !sPhoneInput.trim() || !sPinInput.trim()) {
      alert('يرجى تعبئة كافة الحقول الإلزامية: اسم الطالب، البريد الإلكتروني، رقم جوال ولي الأمر، وكلمة المرور.');
      return;
    }

    if (!sEmailInput.includes('@') || !sEmailInput.includes('.')) {
      alert('يرجى إدخال بريد إلكتروني صحيح للطالب (إلزامي)');
      return;
    }

    const guardianPhoneVal = validateSaudiMobile(sPhoneInput);
    if (!guardianPhoneVal.isValid) {
      alert(guardianPhoneVal.error || 'رقم جوال ولي الأمر غير صحيح: يجب أن يتكون من 10 أرقام ويبدأ بـ 05');
      return;
    }

    const cleanStudentPin = toEnglishDigits(sPinInput).replace(/\D/g, '').trim();
    if (cleanStudentPin.length !== 8) {
      alert('يجب أن تتكون كلمة مرور الطالب من 8 أرقام فقط (مثال: 12345678)');
      return;
    }

    let formattedStudentPersonalPhone: string | undefined = undefined;
    if (sStudentPhoneInput.trim()) {
      const studentPhoneVal = validateSaudiMobile(sStudentPhoneInput);
      if (!studentPhoneVal.isValid) {
        alert(studentPhoneVal.error || 'رقم جوال الطالب غير صحيح: يجب أن يتكون من 10 أرقام ويبدأ بـ 05');
        return;
      }
      formattedStudentPersonalPhone = studentPhoneVal.formattedLocal;
    }

    if (isPasswordUsedByTeacher(sPinInput.trim())) {
      alert('لا يمكن استخدام كلمة مرور مستخدمة من قبل أحد المعلمين. يرجى اختيار كلمة مرور أخرى للطالب لحماية الخصوصية.');
      return;
    }

    const matchedHalaqah = halaqat.find(
      (h) => h.name === sHalaqahInput || h.id === sHalaqahInput
    );
    const chosenSurahObj = SURAH_LIST.find((s) => s.number === sLastSurahNumberInput);
    const surahDisplayName = chosenSurahObj
      ? chosenSurahObj.name
      : sStartSurahInput === 'al-nas'
      ? 'الملك'
      : 'الفاتحة';

    const currentSurah =
      sStartSurahInput === 'al-nas'
        ? Math.max(1, sLastSurahNumberInput - 1)
        : Math.min(114, sLastSurahNumberInput + 1);

    const parsedAge = sAgeInput ? parseInt(sAgeInput, 10) : undefined;

    const student: Student = {
      id: editingStudent ? editingStudent.id : `student_${Date.now()}`,
      fullName: sNameInput.trim(),
      email: sEmailInput.trim() ? sEmailInput.trim().toLowerCase() : undefined,
      rawPhoneNumber: guardianPhoneVal.formattedLocal,
      studentPhone: formattedStudentPersonalPhone,
      passwordPin: sPinInput.trim(),
      grade: sGradeInput,
      gradeAssignedDate: editingStudent?.gradeAssignedDate || new Date().toISOString(),
      age: parsedAge,
      ageAssignedDate: editingStudent?.ageAssignedDate || (parsedAge ? new Date().toISOString() : undefined),
      startSurah: sStartSurahInput,
      lastSurahStoppedAt: surahDisplayName,
      lastSurahNumber: sLastSurahNumberInput,
      currentSurahNumber: currentSurah,
      halaqahId: matchedHalaqah?.id || editingStudent?.halaqahId || 'general',
      halaqahName: matchedHalaqah?.name || sHalaqahInput.trim() || 'حلقة عامة',
      registeredAt: editingStudent ? editingStudent.registeredAt : new Date().toISOString(),
    };

    saveStudent(student);
    setIsAddStudentOpen(false);
    setEditingStudent(null);
    setSNameInput('');
    setSEmailInput('');
    setSPhoneInput('');
    setSStudentPhoneInput('');
    setSHalaqahInput('');
    setSPinInput('');
    setSGradeInput(GRADES_LIST[0]);
    setSAgeInput('');
    setSStartSurahInput('al-nas');
    setSLastSurahNumberInput(67);
    onRefresh();
  };

  // --- Settings Handler ---
  const handleSaveAdminSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveAdminSettings(adminSettings);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
    onRefresh();
  };

  // --- Edit Log Handlers for Admin ---
  const handleOpenEditLog = (log: SessionLog) => {
    setEditingLog(log);
    setEditLogGrade(log.teacherGrade || 'ممتاز');
    setEditLogNotes(log.teacherNotes || '');
    setEditLogStartAyah(log.startAyah || 1);
    setEditLogEndAyah(log.endAyah || 1);
    setEditLogDate(log.date);
  };

  const handleSaveEditedLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog) return;
    const count = Math.max(1, editLogEndAyah - editLogStartAyah + 1);
    const updated: SessionLog = {
      ...editingLog,
      teacherGrade: editLogGrade,
      teacherNotes: editLogNotes.trim() || undefined,
      startAyah: editLogStartAyah,
      endAyah: editLogEndAyah,
      ayahsCount: count,
      date: editLogDate || editingLog.date,
      isConfirmedByTeacher: true,
    };
    saveLog(updated);
    setEditingLog(null);
    onRefresh();
  };

  // Fake Data Generation Handler
  const [isGeneratingFake, setIsGeneratingFake] = useState(false);
  const [fakeDataSuccess, setFakeDataSuccess] = useState<string | null>(null);

  const handlePopulateFakeData = async () => {
    setIsGeneratingFake(true);
    try {
      const summary = await populateFakeTestingData();
      setFakeDataSuccess(
        `تمت إضافة بيانات تجريبية بنجاح: (${summary.classesCount} حلقات، ${summary.teachersCount} معلمين، ${summary.studentsCount} طلاب، ${summary.logsCount} جلسات تسميع، ${summary.attendanceCount} سجلات تحضير).`
      );
      onRefresh();
      setTimeout(() => setFakeDataSuccess(null), 6000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingFake(false);
    }
  };

  // --- Delete Handler via Modal ---
  const handleConfirmDelete = async () => {
    if (deleteDialog.type === 'class') {
      deleteHalaqah(deleteDialog.id);
    } else if (deleteDialog.type === 'teacher') {
      deleteTeacher(deleteDialog.id);
    } else if (deleteDialog.type === 'student') {
      deleteStudent(deleteDialog.id);
    } else if (deleteDialog.type === 'wipe_all_stars') {
      await clearAllStars();
      setSettingsActionSuccess('تم مسح وتصفير كافة النجوم ونقاط التقييم لجميع الطلاب بنجاح!');
    } else if (deleteDialog.type === 'wipe_all_logs') {
      await clearAllLogs();
      setSettingsActionSuccess('تم مسح سجل التسميع بالكامل لجميع الطلاب والمعلمين والإدارة وتصفير عداد الجلسات بنجاح!');
    } else if (deleteDialog.type === 'wipe_all') {
      await clearAllApplicationData();
      setSettingsActionSuccess('تم مسح وتفريغ قاعدة البيانات بالكامل بنجاح!');
    }

    setDeleteDialog({ isOpen: false, type: 'class', id: '', name: '' });
    onRefresh();
  };

  const filteredStudents = useMemo(() => {
    const searchTrimmed = studentSearch.trim();
    const scoredList: { student: Student; score: number }[] = [];

    for (const s of students) {
      let score = 1;

      // 1. Smart Arabic Text Search (Name prioritization: First -> Middle -> Last, Phone, Email, Halaqah)
      if (searchTrimmed) {
        score = scoreArabicNameSearch(s.fullName, searchTrimmed, [
          s.rawPhoneNumber,
          s.email,
          s.halaqahName,
        ]);
        if (score === 0) {
          continue;
        }
      }

      // 2. Halaqah Filter
      if (studentHalaqahFilter !== 'all') {
        if (s.halaqahId !== studentHalaqahFilter && s.halaqahName !== studentHalaqahFilter) {
          continue;
        }
      }

      // 3. Juz & Achievement Filter
      if (studentJuzFilter !== 'all') {
        const completedAjza = calculateCompletedAjza(s.id);
        const completedCount = completedAjza.filter((j) => j.progressPercentage >= 100).length;

        if (studentJuzFilter.startsWith('juz_')) {
          const targetJuzNum = parseInt(studentJuzFilter.replace('juz_', ''), 10);
          const targetJuzProgress = completedAjza.find((j) => j.juzNumber === targetJuzNum);
          if (!targetJuzProgress || targetJuzProgress.progressPercentage < 100) {
            continue;
          }
        } else if (studentJuzFilter === 'completed_5') {
          if (completedCount < 5) continue;
        } else if (studentJuzFilter === 'completed_10') {
          if (completedCount < 10) continue;
        } else if (studentJuzFilter === 'completed_20') {
          if (completedCount < 20) continue;
        } else if (studentJuzFilter === 'completed_30') {
          if (completedCount < 30) continue;
        } else if (studentJuzFilter === 'completed_surahs_10') {
          const stats = calculateStudentStats(s.id);
          if (stats.completedSurahsCount < 10) continue;
        } else if (studentJuzFilter === 'completed_surahs_20') {
          const stats = calculateStudentStats(s.id);
          if (stats.completedSurahsCount < 20) continue;
        } else if (studentJuzFilter === 'completed_surahs_30') {
          const stats = calculateStudentStats(s.id);
          if (stats.completedSurahsCount < 30) continue;
        }
      }

      scoredList.push({ student: s, score });
    }

    // 4. Sorting: If searching, prioritize match relevance (First Name -> Middle Name -> Last Name), then fallback to user sort
    scoredList.sort((itemA, itemB) => {
      if (searchTrimmed && itemB.score !== itemA.score) {
        return itemB.score - itemA.score;
      }

      const a = itemA.student;
      const b = itemB.student;

      if (studentSort === 'az') {
        return a.fullName.localeCompare(b.fullName, 'ar');
      }
      if (studentSort === 'za') {
        return b.fullName.localeCompare(a.fullName, 'ar');
      }
      if (studentSort === 'most_surahs') {
        const statsA = calculateStudentStats(a.id).completedSurahsCount;
        const statsB = calculateStudentStats(b.id).completedSurahsCount;
        if (statsB !== statsA) return statsB - statsA;
        return calculateStudentStats(b.id).totalMemorizedAyahs - calculateStudentStats(a.id).totalMemorizedAyahs;
      }
      if (studentSort === 'most_memorized') {
        const statsA = calculateStudentStats(a.id).totalMemorizedAyahs;
        const statsB = calculateStudentStats(b.id).totalMemorizedAyahs;
        return statsB - statsA;
      }
      if (studentSort === 'least_memorized') {
        const statsA = calculateStudentStats(a.id).totalMemorizedAyahs;
        const statsB = calculateStudentStats(b.id).totalMemorizedAyahs;
        return statsA - statsB;
      }
      if (studentSort === 'newest') {
        const timeA = a.registeredAt ? new Date(a.registeredAt).getTime() : 0;
        const timeB = b.registeredAt ? new Date(b.registeredAt).getTime() : 0;
        return timeB - timeA;
      }
      if (studentSort === 'oldest') {
        const timeA = a.registeredAt ? new Date(a.registeredAt).getTime() : 0;
        const timeB = b.registeredAt ? new Date(b.registeredAt).getTime() : 0;
        return timeA - timeB;
      }
      return 0;
    });

    return scoredList.map((i) => i.student);
  }, [students, studentSearch, studentHalaqahFilter, studentJuzFilter, studentSort]);

  // Current active attendance records for export matching the student roster
  const currentAttendanceRecordsForExport = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const allAtt = getAttendance(today);
    const attMap: Record<string, AttendanceRecord> = {};
    allAtt.forEach((a) => {
      attMap[a.studentId] = a;
    });

    const fallbackAll = getAttendance();
    let effectiveDate = today;
    if (allAtt.length === 0 && fallbackAll.length > 0) {
      const dates = Array.from(new Set(fallbackAll.map((a) => a.date))).sort();
      effectiveDate = dates[dates.length - 1];
      fallbackAll
        .filter((a) => a.date === effectiveDate)
        .forEach((a) => {
          attMap[a.studentId] = a;
        });
    }

    return students.map((s) => {
      const existing = attMap[s.id];
      return {
        id: existing?.id || `att_${s.id}_${effectiveDate}`,
        studentId: s.id,
        studentName: s.fullName,
        halaqahId: s.halaqahId,
        halaqahName: s.halaqahName || 'حلقة عامة',
        date: existing?.date || effectiveDate,
        status: existing?.status || 'present',
        notes: existing?.notes || '',
        createdAt: existing?.createdAt || new Date().toISOString(),
      };
    });
  }, [students]);

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      {/* Admin Top Banner */}
      <div className="bg-linear-to-r from-stone-900 via-amber-950 to-stone-900 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-xl border border-stone-800">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-1 sm:space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-amber-800/80 text-amber-200 text-[11px] sm:text-xs font-bold border border-amber-700">
                لوحة المشرف العام والإدارة
              </span>
            </div>
            <h2 className="text-xl sm:text-3xl font-black">إدارة حلقات القرآن الكريم</h2>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 bg-stone-900/80 border border-stone-800 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl w-full sm:w-auto justify-around sm:justify-start">
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-black text-amber-400">{halaqat.length}</div>
              <div className="text-[10px] text-stone-400">حلقات</div>
            </div>
            <div className="w-px h-6 sm:h-8 bg-stone-700" />
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-black text-white">{teachers.length}</div>
              <div className="text-[10px] text-stone-400">معلمين</div>
            </div>
            <div className="w-px h-6 sm:h-8 bg-stone-700" />
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-black text-emerald-400">{students.length}</div>
              <div className="text-[10px] text-stone-400">طلاب</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 bg-stone-200/80 rounded-xl sm:rounded-2xl max-w-5xl mx-auto overflow-x-auto no-scrollbar scrollbar-none touch-pan-x w-full">
        <button
          onClick={() => setActiveTab('classes')}
          className={`flex-1 shrink-0 min-w-fit py-1.5 sm:py-2 px-2.5 sm:px-3.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'classes'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          الحلقات ({halaqat.length})
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex-1 shrink-0 min-w-fit py-1.5 sm:py-2 px-2.5 sm:px-3.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'attendance'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          <span>تحضير الطلاب</span>
        </button>
        <button
          onClick={() => setActiveTab('teachers')}
          className={`flex-1 shrink-0 min-w-fit py-1.5 sm:py-2 px-2.5 sm:px-3.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'teachers'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          المعلمون ({teachers.length})
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`flex-1 shrink-0 min-w-fit py-1.5 sm:py-2 px-2.5 sm:px-3.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'students'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          الطلاب ({students.length})
        </button>
        <button
          onClick={() => setActiveTab('growth')}
          className={`flex-1 shrink-0 min-w-fit py-1.5 sm:py-2 px-2.5 sm:px-3.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'growth'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          <span>النمو البياني</span>
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 shrink-0 min-w-fit py-1.5 sm:py-2 px-2.5 sm:px-3.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          السجل العام ({visibleLogs.length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 shrink-0 min-w-fit py-1.5 sm:py-2 px-2.5 sm:px-3.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Settings className="w-3.5 h-3.5 text-stone-600 shrink-0" />
          <span>إعدادات النظام</span>
        </button>
        <button
          onClick={() => setActiveTab('tahfeethData')}
          className={`flex-1 shrink-0 min-w-fit py-1.5 sm:py-2 px-2.5 sm:px-3.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'tahfeethData'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          <span>بيانات التحفيظ</span>
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex-1 shrink-0 min-w-fit py-1.5 sm:py-2 px-2.5 sm:px-3.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'leaderboard'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          لوحة الشرف
        </button>
      </div>

      {/* Tab: Attendance Management */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <AttendanceManager
            readOnly={true}
            onAttendanceUpdated={onRefresh}
            onSelectStudent={(st) => setSelectedStudentForProfile(st)}
          />
        </div>
      )}

      {/* Tab: Leaderboard */}
      {activeTab === 'leaderboard' && <LeaderboardView />}

      {/* Tab: Tahfeeth Data Infographic Report (بيانات التحفيظ) */}
      {activeTab === 'tahfeethData' && (
        <TahfeethDataView
          students={students}
          allLogs={allLogs}
          adminSettings={adminSettings}
        />
      )}

      {/* Tab: Growth Tracking (مسار النمو البياني والتحصيل القرآني) */}
      {activeTab === 'growth' && (
        <div className="w-full max-w-full overflow-hidden animate-in fade-in duration-150">
          <GrowthChart />
        </div>
      )}

      {/* Tab: Classes (Halaqat) Management */}
      {activeTab === 'classes' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
            <div>
              <h3 className="font-bold text-sm text-stone-900">قائمة الحلقات القرآنية</h3>
            </div>
            <div className="flex items-center flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setExportSelectedHalaqah(null);
                  setExportSelectedTeacher(null);
                  setExportSelectedStudent(null);
                  setExportModalType('classes');
                  setIsExportModalOpen(true);
                }}
                className="px-3.5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs border border-stone-300 rounded-2xl shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                title="تصدير دليل وسجل الحلقات إلى Google Docs أو Google Sheets"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="truncate">تصدير الحلقات ({formatNumberEn(halaqat.length)})</span>
              </button>
              <button
                onClick={() => {
                  setEditingClass(null);
                  setClassNameInput('');
                  setClassTeacherInput('');
                  setIsAddClassOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>إضافة حلقة جديدة</span>
              </button>
            </div>
          </div>

          {/* Add / Edit Class Form */}
          {isAddClassOpen && (
            <form onSubmit={handleSaveClass} className="bg-amber-50/70 border border-amber-300 p-4 rounded-2xl space-y-3">
              <h4 className="font-bold text-xs text-amber-950">
                {editingClass ? 'تعديل بيانات الحلقة' : 'إضافة حلقة قرآنية جديدة'}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-stone-700">اسم الحلقة / الفصل:</label>
                  <input
                    type="text"
                    value={classNameInput}
                    onChange={(e) => setClassNameInput(e.target.value)}
                    placeholder="مثال: حلقة الإمام نافع"
                    className="w-full h-10 px-3.5 rounded-xl border border-stone-300 text-xs text-stone-900 bg-white shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-medium"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-stone-700">المعلم المسؤول:</label>
                  <select
                    value={classTeacherInput}
                    onChange={(e) => setClassTeacherInput(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border border-stone-300 text-xs text-stone-900 bg-white shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-medium"
                  >
                    <option value="">-- اختر المعلم المسؤول --</option>
                    {classTeacherInput && !teachers.some((t) => t.name.trim() === classTeacherInput.trim()) && (
                      <option value={classTeacherInput}>{classTeacherInput}</option>
                    )}
                    {teachers.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name} {t.phoneNumber ? `(${t.phoneNumber})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddClassOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-stone-300 text-stone-600 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-xs"
                >
                  حفظ الحلقة
                </button>
              </div>
            </form>
          )}

          {/* Classes Grid */}
          {halaqat.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
                <School className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-stone-800 text-sm">لا توجد حلقات قرآنية مضافة حتى الآن</h4>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                ابدأ بإنشاء الحلقة الأولى لحلقات التحفيظ بالضغط على «إضافة حلقة جديدة» أعلاه.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {halaqat.map((h) => {
                const classStudents = students.filter((s) => s.halaqahName === h.name || s.halaqahId === h.id);
                const classStudentIds = classStudents.map((s) => s.id);
                const weeklyAttendance = calculateWeeklyHalaqahAttendance(classStudentIds, h.id);
                return (
                  <div
                    key={h.id}
                    className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3 flex flex-col justify-between hover:border-amber-400 transition-all cursor-pointer group"
                    onClick={() => setSelectedDrillHalaqah(h)}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0 shrink-0">
                          <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold text-xs border border-amber-200 group-hover:bg-amber-600 group-hover:text-white transition-colors shrink-0">
                            <School className="w-4 h-4" />
                          </span>
                          {/* شارات الحضور والغياب - بجانب أيقونة الحلقة كما هو مطلوب بالصورة */}
                          <div className="flex items-center gap-1 pointer-events-none select-none shrink-0">
                            <span
                              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold shadow-2xs cursor-default whitespace-nowrap shrink-0 ${
                                weeklyAttendance.absent > 0
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : "bg-stone-100 text-stone-600 border border-stone-200"
                              }`}
                              title={`غياب هذا الأسبوع (الأيام الأربعة): ${formatNumberEn(weeklyAttendance.absent)}`}
                            >
                              <span>{formatNumberEn(weeklyAttendance.absent)} غياب</span>
                            </span>

                            <span
                              className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] sm:text-[11px] font-bold shadow-2xs cursor-default whitespace-nowrap shrink-0"
                              title={`حضور هذا الأسبوع (الأيام الأربعة): ${formatNumberEn(weeklyAttendance.present)}`}
                            >
                              <span>{formatNumberEn(weeklyAttendance.present)} حضور</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setSelectedDrillHalaqah(h)}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 cursor-pointer transition-colors shadow-2xs"
                            title="عرض تفاصيل الحلقة وسجل التسميع"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExportSelectedHalaqah(h);
                              setExportSelectedTeacher(null);
                              setExportSelectedStudent(null);
                              setExportModalType("classes");
                              setIsExportModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 cursor-pointer transition-colors shadow-2xs"
                            title={`تصدير بيانات حلقة ${h.name}`}
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingClass(h);
                              setClassNameInput(h.name);
                              setClassTeacherInput(h.teacherName || "");
                              setIsAddClassOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 cursor-pointer transition-colors"
                            title="تعديل اسم الحلقة"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteDialog({
                                isOpen: true,
                                type: "class",
                                id: h.id,
                                name: h.name,
                              })
                            }
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer transition-colors"
                            title="حذف الحلقة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h4 className="font-extrabold text-stone-900 text-base pt-1 group-hover:text-amber-900 transition-colors">
                        {h.name}
                      </h4>
                      <p className="text-xs text-stone-500 pt-0.5 truncate">
                        المعلم: {h.teacherName || "غير محدد بعد"}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
                      <span className="text-xs text-stone-500 font-medium flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span>الطلاب المسجلون</span>
                      </span>
                      <span className="font-bold text-stone-900 bg-stone-100 px-3 py-1 rounded-full whitespace-nowrap text-xs">
                        {formatNumberEn(classStudents.length)} طلاب
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Teachers Management */}
      {activeTab === 'teachers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
            <div>
              <h3 className="font-bold text-sm text-stone-900">قائمة معلمي الحلقات</h3>
            </div>
            <div className="flex items-center flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setExportSelectedHalaqah(null);
                  setExportSelectedTeacher(null);
                  setExportSelectedStudent(null);
                  setExportModalType('teachers');
                  setIsExportModalOpen(true);
                }}
                className="px-3.5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs border border-stone-300 rounded-2xl shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                title="تصدير بيانات المعلمين إلى Google Docs أو Google Sheets"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="truncate">تصدير المعلمين ({formatNumberEn(teachers.length)})</span>
              </button>
              <button
                onClick={() => {
                  setEditingTeacher(null);
                  setTNameInput('');
                  setTPhoneInput('');
                  setTEmailInput('');
                  setTPinInput('');
                  setTHalaqahInput('');
                  setIsAddTeacherOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>إضافة معلم جديد</span>
              </button>
            </div>
          </div>

          {/* Add / Edit Teacher Modal */}
          {isAddTeacherOpen && (
            <form onSubmit={handleSaveTeacher} className="bg-amber-50/70 border border-amber-300 p-4 sm:p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
                <h4 className="font-extrabold text-sm text-amber-950">
                  {editingTeacher ? `تعديل كافة بيانات المعلم (${editingTeacher.name})` : 'إضافة معلم جديد'}
                </h4>
                {editingTeacher && (
                  <span className="text-[11px] font-medium text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full">
                    يمكنك تعديل جميع بيانات المعلم والرمز السري والحلقة
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">اسم المعلم الكامل:</label>
                  <input
                    type="text"
                    value={tNameInput}
                    onChange={(e) => setTNameInput(e.target.value)}
                    placeholder="الشيخ فلان بن فلان"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-stone-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center justify-between">
                    <span>رقم الجوال: *</span>
                    {tPhoneInput.length > 0 && (
                      <span className="text-[11px] tabular-nums text-amber-700 font-bold" dir="ltr">
                        {tPhoneInput.length} / 10
                      </span>
                    )}
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={tPhoneInput}
                    onChange={(e) => {
                      const digits = toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 10);
                      setTPhoneInput(digits);
                    }}
                    placeholder="05XXXXXXXX"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-stone-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    dir="ltr"
                    required
                  />
                  {tPhoneInput.length >= 2 && !tPhoneInput.startsWith('05') && (
                    <p className="text-[11px] text-amber-700 font-bold mt-1">
                      ⚠️ يجب أن يبدأ رقم الجوال بـ 05
                    </p>
                  )}
                  {tPhoneInput.length === 10 && tPhoneInput.startsWith('05') && (
                    <p className="text-[11px] text-emerald-700 font-bold mt-1">
                      ✅ رقم جوال صحيح ومكتمل
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">البريد الإلكتروني (اختياري):</label>
                  <input
                    type="email"
                    value={tEmailInput}
                    onChange={(e) => setTEmailInput(e.target.value)}
                    placeholder="teacher@example.com"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-stone-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    كلمة المرور الموحدة للمعلم:
                  </label>
                  <input
                    type="password"
                    value={tPinInput}
                    onChange={(e) => setTPinInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-stone-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1">الحلقة القرآنية التابعة:</label>
                  <input
                    type="text"
                    list="admin-halaqat-list"
                    value={tHalaqahInput}
                    onChange={(e) => setTHalaqahInput(e.target.value)}
                    placeholder="اختر أو اكتب اسم الحلقة التابعة للمعلم"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-stone-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    required
                  />
                  <datalist id="admin-halaqat-list">
                    {halaqat.map((h) => (
                      <option key={h.id} value={h.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1 border-t border-amber-200/80">
                <button
                  type="button"
                  onClick={() => setIsAddTeacherOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-600 hover:text-stone-900 text-xs font-bold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {editingTeacher ? 'حفظ كافة تعديلات المعلم' : 'حفظ المعلم'}
                </button>
              </div>
            </form>
          )}

          {/* Teachers List */}
          {teachers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-stone-800 text-sm">لا يوجد معلمون مسجلون حتى الآن</h4>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                اضغط على «إضافة معلم جديد» لإضافة مشايخ ومعلمي الحلقات وتعيين كل معلم لحلقته الخاصة.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {teachers.map((t) => {
                const teacherStudents = students.filter(
                  (s) => s.halaqahName === t.halaqahName || s.halaqahId === t.halaqahId
                );
                return (
                  <div
                    key={t.id}
                    className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3 flex flex-col justify-between hover:border-emerald-400/80 transition-all group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-xs border border-emerald-200 group-hover:bg-emerald-700 group-hover:text-white transition-colors">
                          <GraduationCap className="w-4 h-4" />
                        </span>
                        <div className="flex items-center gap-1">
                          {/* Teacher Profile Eye Button (matches students eye button) */}
                          <button
                            type="button"
                            onClick={() => setSelectedTeacherForProfile(t)}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 cursor-pointer transition-colors shadow-2xs"
                            title="عرض ملف المعلم الشامل وكافة المعلومات"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {/* Export individual teacher */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExportSelectedTeacher(t);
                              setExportSelectedHalaqah(null);
                              setExportSelectedStudent(null);
                              setExportModalType("single_teacher");
                              setIsExportModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 cursor-pointer transition-colors shadow-2xs"
                            title={`تصدير تقرير وبيانات المعلم ${t.name} وحلقته`}
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTeacher(t);
                              setTNameInput(t.name);
                              setTPhoneInput(t.phoneNumber);
                              setTEmailInput(t.email || "");
                              setTPinInput(t.passwordPin || TEACHER_GLOBAL_PASSWORD);
                              setTHalaqahInput(t.halaqahName);
                              setIsAddTeacherOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 cursor-pointer transition-colors"
                            title="تعديل بيانات المعلم"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteDialog({
                                isOpen: true,
                                type: "teacher",
                                id: t.id,
                                name: t.name,
                              })
                            }
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer transition-colors"
                            title="حذف المعلم"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h4 className="font-extrabold text-stone-900 text-base pt-1">
                        {t.name}
                      </h4>
                      {t.phoneNumber ? (
                        <div className="text-xs text-stone-500 flex items-center gap-1.5 pt-0.5 justify-start text-right">
                          <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span dir="ltr" className="tabular-nums font-semibold text-stone-600">
                            {t.phoneNumber}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
                      <span className="text-xs text-stone-500 font-medium flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span>الطلاب المسجلون</span>
                      </span>
                      <span
                        onClick={() => setSelectedTeacherForProfile(t)}
                        className="font-bold text-stone-900 bg-stone-100 hover:bg-emerald-100 hover:text-emerald-900 px-3 py-1 rounded-full whitespace-nowrap text-xs transition-colors cursor-pointer"
                        title="عرض طلاب وبيانات المعلم"
                      >
                        {formatNumberEn(teacherStudents.length)} طلاب
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Students Management */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          {/* Admin Students Top Bar: Organized Search, Actions & Filters */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200 shadow-xs space-y-3">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 w-full min-w-0">
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="بحث باسم الطالب، رقم الجوال، أو البريد الإلكتروني..."
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-2xl border border-stone-300 text-xs text-stone-900 bg-stone-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
              </div>

              {/* Action Buttons: Export, Add Student */}
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full lg:w-auto">
                {/* Export Button */}
                <button
                  type="button"
                  onClick={() => {
                    setExportSelectedHalaqah(null);
                    setExportSelectedTeacher(null);
                    setExportSelectedStudent(null);
                    setExportModalType('students');
                    setIsExportModalOpen(true);
                  }}
                  className="px-3.5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs border border-stone-300 rounded-2xl shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
                  title="تصدير بيانات الطلاب إلى Google Docs أو Google Sheets"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="truncate">تصدير الطلاب ({formatNumberEn(filteredStudents.length)})</span>
                </button>

                {/* Add New Student Button */}
                <button
                  type="button"
                  onClick={() => {
                    setEditingStudent(null);
                    setSNameInput('');
                    setSEmailInput('');
                    setSPhoneInput('');
                    setSHalaqahInput(halaqat[0]?.name || 'حلقة عامة');
                    setSPinInput('');
                    setSGradeInput(GRADES_LIST[0]);
                    setSAgeInput('');
                    setSStartSurahInput('al-nas');
                    setSLastSurahNumberInput(67);
                    setIsAddStudentOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
                >
                  <PlusCircle className="w-4 h-4 shrink-0" />
                  <span className="truncate">إضافة طالب</span>
                </button>
              </div>
            </div>

            {/* Filter and Sort Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2.5 border-t border-stone-100 w-full">
              {/* Halaqah Filter */}
              <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 min-w-0">
                <SlidersHorizontal className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <select
                  value={studentHalaqahFilter}
                  onChange={(e) => setStudentHalaqahFilter(e.target.value)}
                  className="bg-transparent text-xs text-stone-700 font-bold focus:outline-hidden py-0.5 cursor-pointer w-full min-w-0 truncate"
                  title="تصفية حسب الحلقة"
                >
                  <option value="all">كل الحلقات ({students.length})</option>
                  {halaqat.map((h) => (
                    <option key={h.id} value={h.name}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Juz & Achievement Filter */}
              <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 min-w-0">
                <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <select
                  value={studentJuzFilter}
                  onChange={(e) => setStudentJuzFilter(e.target.value)}
                  className="bg-transparent text-xs text-stone-700 font-bold focus:outline-hidden py-0.5 cursor-pointer w-full min-w-0 truncate"
                  title="تصفية حسب الإنجاز"
                >
                  <option value="all">كل مستويات الحفظ</option>
                  <option value="completed_30">خاتم للقرآن (30 جزء)</option>
                  <option value="completed_20">حفظ 20 جزء أو أكثر</option>
                  <option value="completed_10">حفظ 10 أجزاء أو أكثر</option>
                  <option value="completed_5">حفظ 5 أجزاء أو أكثر</option>
                  <optgroup label="حسب السور المكتملة">
                    <option value="completed_surahs_10">حفظ 10 سور أو أكثر</option>
                    <option value="completed_surahs_20">حفظ 20 سورة أو أكثر</option>
                    <option value="completed_surahs_30">حفظ 30 سورة أو أكثر</option>
                  </optgroup>
                  <optgroup label="أتم حفظ جزء محدد">
                    {QURAN_JUZS.map((j) => (
                      <option key={j.juzNumber} value={`juz_${j.juzNumber}`}>
                        الجزء {j.juzNumber} ({j.name})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Sorting */}
              <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 min-w-0">
                <ArrowUpDown className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <select
                  value={studentSort}
                  onChange={(e) => setStudentSort(e.target.value as any)}
                  className="bg-transparent text-xs text-stone-700 font-bold focus:outline-hidden py-0.5 cursor-pointer w-full min-w-0 truncate"
                  title="ترتيب الطلاب"
                >
                  <option value="az">أبجدي (أ - ي)</option>
                  <option value="za">أبجدي (ي - أ)</option>
                  <option value="most_surahs">الأكثر حفظاً للسور</option>
                  <option value="most_memorized">الأكثر حفظاً للآيات</option>
                  <option value="least_memorized">الأقل حفظاً</option>
                  <option value="newest">الأحدث تسجيلاً</option>
                  <option value="oldest">الأقدم تسجيلاً</option>
                </select>
              </div>
            </div>
          </div>

          {/* Add / Edit Student Modal */}
          {isAddStudentOpen && (
            <form onSubmit={handleSaveStudent} className="bg-emerald-50/70 border border-emerald-300 p-5 sm:p-6 rounded-3xl space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-emerald-950">
                      {editingStudent ? 'تعديل بيانات الطالب وحساب الحفظ' : 'إضافة طالب جديد إلى النظام'}
                    </h4>
                    <p className="text-xs text-emerald-800/80">
                      يمكنك تعديل وتعيين البريد الإلكتروني، الصف الدراسي، ومسار الحفظ
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddStudentOpen(false)}
                  className="text-stone-400 hover:text-stone-700 text-xs font-bold"
                >
                  إغلاق
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">اسم الطالب الرباعي: *</label>
                  <input
                    type="text"
                    value={sNameInput}
                    onChange={(e) => setSNameInput(e.target.value)}
                    placeholder="مثال: صالح بن فهد بن محمد الشمري"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs text-stone-900 bg-white focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-emerald-700" />
                    <span>البريد الإلكتروني للطالب: * (إلزامي)</span>
                  </label>
                  <input
                    type="email"
                    value={sEmailInput}
                    onChange={(e) => setSEmailInput(e.target.value)}
                    placeholder="student@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs text-stone-900 bg-white focus:ring-2 focus:ring-emerald-500"
                    dir="ltr"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center justify-between">
                    <span>رقم جوال ولي الأمر: * (إلزامي)</span>
                    {sPhoneInput.length > 0 && (
                      <span className="text-[11px] tabular-nums text-emerald-700 font-bold" dir="ltr">
                        {sPhoneInput.length} / 10
                      </span>
                    )}
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={sPhoneInput}
                    onChange={(e) => {
                      const digits = toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 10);
                      setSPhoneInput(digits);
                    }}
                    placeholder="05XXXXXXXX"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs text-stone-900 bg-white focus:ring-2 focus:ring-emerald-500"
                    required
                    dir="ltr"
                  />
                  {sPhoneInput.length >= 2 && !sPhoneInput.startsWith('05') && (
                    <p className="text-[11px] text-amber-700 font-bold mt-1">
                      ⚠️ يجب أن يبدأ رقم الجوال بـ 05
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center justify-between">
                    <span>رقم جوال الطالب الخاص (اختياري):</span>
                    <span className="text-[10px] text-stone-400 font-normal">
                      {sStudentPhoneInput.length > 0 ? (
                        <span className="tabular-nums text-teal-700 font-bold" dir="ltr">
                          {sStudentPhoneInput.length} / 10
                        </span>
                      ) : (
                        'اختياري'
                      )}
                    </span>
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={sStudentPhoneInput}
                    onChange={(e) => {
                      const digits = toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 10);
                      setSStudentPhoneInput(digits);
                    }}
                    placeholder="05XXXXXXXX"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs text-stone-900 bg-white focus:ring-2 focus:ring-emerald-500"
                    dir="ltr"
                  />
                  {sStudentPhoneInput.length >= 2 && !sStudentPhoneInput.startsWith('05') && (
                    <p className="text-[11px] text-amber-700 font-bold mt-1">
                      ⚠️ يجب أن يبدأ رقم الجوال بـ 05
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center justify-between">
                    <span>كلمة المرور الخاصة بالطالب: *</span>
                    {sPinInput.length > 0 && (
                      <span className="text-[11px] tabular-nums text-emerald-600 font-bold" dir="ltr">
                        {sPinInput.length} / 8
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={8}
                    pattern="[0-9]*"
                    value={sPinInput}
                    onChange={(e) => {
                      const digits = toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 8);
                      setSPinInput(digits);
                    }}
                    placeholder="8 أرقام (مثال: 12345678)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs bg-white focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">مرحلة المسجل:</label>
                  <select
                    value={sGradeInput}
                    onChange={(e) => setSGradeInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs text-stone-900 bg-white focus:ring-2 focus:ring-emerald-500 font-bold"
                  >
                    {GRADES_LIST.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">عمر الطالب (بالسنوات):</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={sAgeInput}
                    onChange={(e) => {
                      const val = toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 3);
                      setSAgeInput(val);
                    }}
                    placeholder="أدخل العمر بالسنوات (مثال: 14)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs text-stone-900 bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">الحلقة القرآنية:</label>
                  <select
                    value={sHalaqahInput}
                    onChange={(e) => setSHalaqahInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs text-stone-900 bg-white focus:ring-2 focus:ring-emerald-500"
                  >
                    {halaqat.map((h) => (
                      <option key={h.id} value={h.name}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Start Surah & Last Surah Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-emerald-200">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-emerald-950">
                    من أي سورة بدأ الطالب الحفظ في مسيرته؟
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSStartSurahInput('al-nas');
                        setSLastSurahNumberInput(67);
                      }}
                      className={`p-2.5 rounded-xl border text-xs text-right transition-all cursor-pointer flex items-center justify-between ${
                        sStartSurahInput === 'al-nas'
                          ? 'bg-emerald-800 text-white border-emerald-800 font-bold'
                          : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                      }`}
                    >
                      <div>من سورة الناس</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSStartSurahInput('al-baqarah');
                        setSLastSurahNumberInput(1);
                      }}
                      className={`p-2.5 rounded-xl border text-xs text-right transition-all cursor-pointer flex items-center justify-between ${
                        sStartSurahInput === 'al-baqarah'
                          ? 'bg-emerald-800 text-white border-emerald-800 font-bold'
                          : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                      }`}
                    >
                      <div>من سورة الفاتحة</div>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-emerald-950">
                      آخر سورة توقف عندها الطالب / يحفظ فيها الآن:
                    </label>
                  </div>
                  <select
                    value={sLastSurahNumberInput}
                    onChange={(e) => setSLastSurahNumberInput(parseInt(e.target.value, 10))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-bold text-stone-900 bg-white focus:ring-2 focus:ring-emerald-500"
                  >
                    {sStartSurahInput === 'al-nas'
                      ? surahsFromAnNas.map((s) => (
                          <option key={s.number} value={s.number}>
                            سورة {s.name} ({s.number}) - {s.numberOfAyahs} آية
                          </option>
                        ))
                      : surahsFromAlBaqarah.map((s) => (
                          <option key={s.number} value={s.number}>
                            سورة {s.name} ({s.number}) - {s.numberOfAyahs} آية
                          </option>
                        ))}
                  </select>
                </div>
              </div>

              {/* Automatic Calculation Helper Notice */}
              <div className="p-3 rounded-2xl bg-white/80 border border-emerald-200 text-emerald-900 text-xs leading-relaxed">
                ✨ <strong>احتساب الحفظ التلقائي:</strong> عند حفظ الطالب مع تحديد سورة (مثلاً: <strong>سورة الملك</strong>)، يعتبر النظام تلقائياً جميع السور السابقة بدءاً من سورة الناس وحتى سورة القلم كمحفوظة ومتقنة في إحصائيات الطالب ونسبة إنجازه.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddStudentOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-600 text-xs font-bold hover:bg-stone-100 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingStudent ? 'حفظ التعديلات' : 'إضافة وتثبيت الطالب'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Students List */}
          {filteredStudents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-stone-800 text-sm">لا يوجد طلاب مسجلون حالياً</h4>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                يمكنك تسجيل الطلاب يدوياً عبر «إضافة طالب جديد»، أو استيراد كشف كامل عبر «استيراد كشف طلاب»، أو يتاح للطلاب التسجيل الذاتي.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs divide-y divide-stone-100">
              {filteredStudents.map((st) => {
                const stats = calculateStudentStats(st.id);
                return (
                  <div key={st.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-stone-50 transition-colors">
                    <div
                      onClick={() => setSelectedStudentForProfile(st)}
                      className="space-y-1.5 cursor-pointer group flex-1"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-stone-900 text-sm group-hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                          <span>{st.fullName}</span>
                          <Eye className="w-3.5 h-3.5 text-stone-400 group-hover:text-emerald-600" />
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                          {st.halaqahName}
                        </span>
                      </div>

                      {/* Stars, Surahs & Attendance Metrics Badges */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 font-extrabold text-[11px]">
                          <BookOpen className="w-3 h-3 text-emerald-700" />
                          <span>{formatNumberEn(stats.completedSurahsCount)} سورة محفوظة</span>
                        </span>

                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 font-extrabold text-[11px]">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          <span>{formatNumberEn(stats.totalStars)} نجمة</span>
                        </span>

                        <span 
                          title="أيام الغياب خلال الأسبوع الحالي (تتجدد تلقائياً مع بداية كل أسبوع دراسي جديد)"
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          stats.totalAbsents > 0
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-stone-100 text-stone-500 border border-stone-200'
                        }`}>
                          <span>{formatNumberEn(stats.totalAbsents)} غياب (أسبوعياً)</span>
                        </span>

                        <span 
                          title="أيام الحضور خلال الأسبوع الحالي (تتجدد تلقائياً مع بداية كل أسبوع دراسي جديد)"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold"
                        >
                          <span>{formatNumberEn(stats.totalPresent)} حضور (أسبوعياً)</span>
                        </span>

                        
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap justify-start md:justify-end w-full md:w-auto">

                      <button
                        onClick={() => setSelectedStudentForProfile(st)}
                        className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 cursor-pointer"
                        title="عرض ملف الطالب الشامل"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* WhatsApp Button to message parent directly */}
                      {st.rawPhoneNumber ? (
                        <a
                          href={`https://wa.me/966${st.rawPhoneNumber.replace(/\D/g, '').replace(/^0/, '')}?text=${encodeURIComponent(
                            `السلام عليكم ورحمة الله وبركاته، ولي أمر الطالب ${st.fullName} (مجمع حلقات جامع الوالدين).`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[#25D366] hover:text-[#1ebd5b] cursor-pointer transition-colors shadow-2xs flex items-center justify-center"
                          title={`مراسلة ولي أمر الطالب ${st.fullName} عبر واتساب (${st.rawPhoneNumber})`}
                        >
                          <MessageCircle className="w-3.5 h-3.5 fill-current" />
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 rounded-xl bg-stone-100 border border-stone-200 text-stone-300 cursor-not-allowed opacity-50 flex items-center justify-center"
                          title="لم يتم تسجيل رقم جوال لولي الأمر"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Export individual student directly */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExportSelectedStudent(st);
                          setExportSelectedHalaqah(null);
                          setExportSelectedTeacher(null);
                          setExportModalType('single_student');
                          setIsExportModalOpen(true);
                        }}
                        className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 cursor-pointer transition-colors shadow-2xs"
                        title={`تصدير تقرير وبيانات الطالب ${st.fullName}`}
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          setEditingStudent(st);
                          setSNameInput(st.fullName);
                          setSEmailInput(st.email || '');
                          setSPhoneInput(st.rawPhoneNumber || '');
                          setSStudentPhoneInput(st.studentPhone || '');
                          setSHalaqahInput(st.halaqahName || '');
                          setSPinInput(st.passwordPin || '');
                          setSGradeInput(st.grade || GRADES_LIST[0]);
                          setSAgeInput(st.age ? st.age.toString() : '');
                          setSStartSurahInput(st.startSurah || 'al-nas');
                          setSLastSurahNumberInput(st.lastSurahNumber || 67);
                          setIsAddStudentOpen(true);
                        }}
                        className="p-2 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-600 cursor-pointer"
                        title="تعديل كافة بيانات الطالب"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() =>
                          setDeleteDialog({
                            isOpen: true,
                            type: 'student',
                            id: st.id,
                            name: st.fullName,
                          })
                        }
                        className="p-2 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 cursor-pointer"
                        title="حذف الطالب"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: All Logs & Audits */}
      {activeTab === 'logs' && (() => {
        const visibleLogs = allLogs;

        return (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 flex-wrap gap-2">
              <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-amber-700" />
                <span>سجل التسميع والمراجعة العام ({visibleLogs.length})</span>
              </h3>
              {visibleLogs.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setDeleteDialog({
                      isOpen: true,
                      type: 'wipe_all_logs',
                      id: 'all_logs',
                      name: 'كافة سجلات التسميع لجميع الطلاب والمعلمين والإدارة في النظام بالكامل',
                    })
                  }
                  className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="مسح سجل التسميع بالكامل للجميع"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>مسح سجل التسميع بالكامل للجميع</span>
                </button>
              )}
            </div>

            {visibleLogs.length === 0 ? (
              <div className="bg-stone-50 rounded-2xl border border-stone-200 p-8 text-center space-y-2">
                <FileCheck className="w-8 h-8 text-stone-400 mx-auto" />
                <h4 className="font-bold text-stone-700 text-sm">لم يتم تسجيل أي جلسات تسميع</h4>
                <p className="text-xs text-stone-500">
                  عندما يقوم المعلمون بتسجيل جلسات الحفظ والمراجعة لطلابهم، ستظهر السجلات هنا تلقائيًا.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {visibleLogs.map((log) => {
                const student = students.find((s) => s.id === log.studentId);
                const isCombined = log.type === 'combined';
                const isHifz = log.type === 'hifz';

                return (
                  <div
                    key={log.id}
                    className="p-4 rounded-xl border border-stone-200 bg-white hover:border-amber-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {student ? (
                          <button
                            type="button"
                            onClick={() => setSelectedStudentForProfile(student)}
                            className="font-extrabold text-stone-900 text-sm hover:text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer text-right"
                          >
                            <span>{log.studentName}</span>
                            <Eye className="w-3.5 h-3.5 text-stone-400" />
                          </button>
                        ) : (
                          <span className="font-extrabold text-stone-900 text-sm">{log.studentName}</span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isCombined
                              ? 'bg-emerald-900 text-amber-300'
                              : isHifz
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-teal-100 text-teal-800'
                          }`}
                        >
                          {isCombined ? 'حفظ + مراجعة' : isHifz ? 'حفظ' : 'مراجعة'}
                        </span>
                        {isCombined ? (
                          <span className="text-xs font-bold text-stone-800">
                            🟢 سورة {log.surahName} ({log.startAyah}-{log.endAyah}) • 🔵 سورة {log.murajaahSurahName || log.surahName} ({log.murajaahStartAyah || 1}-{log.murajaahEndAyah || 1})
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-stone-800">
                            سورة {log.surahName} (الآيات {log.startAyah} - {log.endAyah}) • {log.ayahsCount} آية
                          </span>
                        )}
                        <SessionStarsBadge
                          points={log.evaluationPoints}
                          totalStars={log.totalStars}
                          teacherGrade={log.teacherGrade}
                          size="xs"
                          showDetailsToggle={true}
                        />
                        {log.teacherGrade && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                            {log.teacherGrade}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-stone-500">
                        التاريخ: {formatDateEn(log.date)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        );
      })()}

      {/* Tab: Admin System Settings */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 max-w-2xl mx-auto space-y-6">
          <div className="border-b border-stone-100 pb-4">
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-amber-700" />
              <span>إعدادات النظام والمسجد</span>
            </h3>
          </div>

          {settingsActionSuccess && (
            <div className="p-3.5 bg-emerald-50 text-emerald-900 rounded-xl text-xs font-bold flex items-center justify-between gap-2 border border-emerald-300 shadow-2xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{settingsActionSuccess}</span>
              </div>
              <button
                type="button"
                onClick={() => setSettingsActionSuccess(null)}
                className="text-emerald-700 hover:text-emerald-900 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <form onSubmit={handleSaveAdminSettings} className="space-y-4">
            {/* Official Recitation Days Configuration for Teachers */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <label className="block text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-700" />
                    <span>أيام التسميع المعتمدة للمعلمين (صلاحية توثيق التسميع):</span>
                  </label>
                </div>
              </div>

              {/* Day Selection Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 pt-1">
                {WEEK_DAYS_OPTIONS.map((day) => {
                  const currentDays = adminSettings.activeRecitationDays || [0, 1, 2, 3];
                  const isSelected = currentDays.includes(day.dayIndex);

                  return (
                    <button
                      type="button"
                      key={day.dayIndex}
                      onClick={() => {
                        const updated = isSelected
                          ? currentDays.filter((d) => d !== day.dayIndex)
                          : [...currentDays, day.dayIndex].sort((a, b) => a - b);
                        setAdminSettingsState({
                          ...adminSettings,
                          activeRecitationDays: updated,
                        });
                      }}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                        isSelected
                          ? 'bg-emerald-800 text-white border-emerald-800 font-bold shadow-xs'
                          : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-100 hover:border-stone-400'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <CheckCircle2
                          className={`w-3.5 h-3.5 ${
                            isSelected ? 'text-emerald-300' : 'text-stone-300'
                          }`}
                        />
                        <span className="text-xs">{day.arabicName}</span>
                      </div>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium ${
                          isSelected
                            ? 'bg-emerald-950/60 text-emerald-200'
                            : 'bg-stone-100 text-stone-400'
                        }`}
                      >
                        {isSelected ? 'مسموح' : 'غير مصرح'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {settingsSaved && (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>تم حفظ إعدادات النظام بنجاح!</span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>حفظ التعديلات</span>
              </button>
            </div>
          </form>

          {/* Database Tools in One Clean Vertical Line */}
          <div className="mt-8 pt-6 border-t border-stone-200 space-y-3">
            <div>
              <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-stone-600" />
                <span>إدارة وتنظيف بيانات النظام</span>
              </h4>
            </div>

            {fakeDataSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 border border-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{fakeDataSuccess}</span>
              </div>
            )}

            {/* Unified Vertical Stack (One Clean Vertical Line) */}
            <div className="bg-white border border-stone-200 rounded-2xl divide-y divide-stone-100 shadow-2xs overflow-hidden">
              
              {/* 1. إضافة بيانات تجريبية جاهزة للاختبار (حلقات، معلمين، طلاب، وسجلات) */}
              <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50/70 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-emerald-700" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-stone-900">
                      إضافة بيانات تجريبية جاهزة للاختبار (حلقات، معلمين، طلاب، وسجلات)
                    </h5>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      تعبئة تلقائية بـ 4 حلقات و4 معلمين و12 طالباً مع سجلات تسميع ومراجعة وتحضير
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handlePopulateFakeData}
                  disabled={isGeneratingFake}
                  className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isGeneratingFake ? 'جارٍ الإضافة...' : 'إضافة بيانات تجريبية'}</span>
                </button>
              </div>

              {/* 2. مسح وتصفير جميع النجوم للجميع */}
              <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50/70 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                    <StarOff className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-stone-900">
                      مسح وتصفير جميع النجوم للجميع
                    </h5>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      إعادة رصيد النجوم إلى (0) لجميع الطلاب مع الحفاظ الكامل على كافة السجلات والآيات
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setDeleteDialog({
                      isOpen: true,
                      type: 'wipe_all_stars',
                      id: 'all',
                      name: 'رصيد النجوم ونقاط التقييم لكافة الطلاب في جميع الحلقات',
                    })
                  }
                  className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold text-xs transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
                >
                  <StarOff className="w-3.5 h-3.5 text-amber-600" />
                  <span>تصفير جميع النجوم</span>
                </button>
              </div>

              {/* 3. مسح سجل التسميع بالكامل للجميع */}
              <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50/70 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                    <Trash2 className="w-4 h-4 text-rose-600" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-stone-900">
                      مسح سجل التسميع بالكامل للجميع
                    </h5>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      حذف كافة سجلات التسميع لجميع الطلاب والمعلمين والإدارة بضغطة زر واحدة مع تصفير العداد
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setDeleteDialog({
                      isOpen: true,
                      type: 'wipe_all_logs',
                      id: 'all_logs',
                      name: 'كافة سجلات التسميع لجميع الطلاب والمعلمين والإدارة في النظام بالكامل',
                    })
                  }
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-100" />
                  <span>مسح سجل التسميع للجميع</span>
                </button>
              </div>

              {/* 4. تفريغ ومسح كافة البيانات (تهيئة للنشر) */}
              <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50/70 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-300 flex items-center justify-center shrink-0">
                    <Trash2 className="w-4 h-4 text-stone-600" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-stone-900">
                      تفريغ ومسح كافة البيانات (تهيئة للنشر)
                    </h5>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      مسح كافة الحلقات والمعلمين والطلاب وسجلات التسميع والتحضير لإعادة النظام لحالته الصفرية
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setDeleteDialog({
                      isOpen: true,
                      type: 'wipe_all',
                      id: 'all',
                      name: 'كافة البيانات (الطلاب، المعلمين، الحلقات، السجلات، التحضير)',
                    })
                  }
                  className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-900 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
                >
                  <Trash2 className="w-3.5 h-3.5 text-stone-300" />
                  <span>مسح وتفريغ الكل</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Halaqah Detailed Drill-down Modal */}
      {selectedDrillHalaqah && (
        <HalaqahDetailModal
          isOpen={!!selectedDrillHalaqah}
          onClose={() => setSelectedDrillHalaqah(null)}
          halaqah={selectedDrillHalaqah}
          isAdmin={true}
          onExport={() => {
            setExportSelectedHalaqah(selectedDrillHalaqah);
            setExportSelectedTeacher(null);
            setExportSelectedStudent(null);
            setExportModalType('classes');
            setIsExportModalOpen(true);
          }}
          onOpenParentMessage={onOpenParentMessage}
          onOpenParentMessageModal={onOpenParentMessage}
          onOpenAttendance={(halaqahId) => {
            setSelectedDrillHalaqah(null);
            setActiveTab('attendance');
          }}
          onSelectStudent={(st) => setSelectedStudentForProfile(st)}
          onDataChanged={onRefresh}
          onRefresh={onRefresh}
        />
      )}

      {/* Edit Log Modal for Admin */}
      {editingLog && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-stone-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-black text-stone-900 text-base flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-700" />
                <span>تعديل سجل التسميع</span>
              </h3>
              <button
                onClick={() => setEditingLog(null)}
                className="text-stone-400 hover:text-stone-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-950">
              <span className="font-bold block">الطالب: {editingLog.studentName}</span>
              <span className="text-stone-600 block mt-0.5">السورة: {editingLog.surahName}</span>
            </div>

            <form onSubmit={handleSaveEditedLog} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">من آية:</label>
                  <input
                    type="number"
                    min={1}
                    value={editLogStartAyah}
                    onChange={(e) => setEditLogStartAyah(parseInt(e.target.value) || 1)}
                    className="w-full p-2 rounded-xl border border-stone-300 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">إلى آية:</label>
                  <input
                    type="number"
                    min={1}
                    value={editLogEndAyah}
                    onChange={(e) => setEditLogEndAyah(parseInt(e.target.value) || 1)}
                    className="w-full p-2 rounded-xl border border-stone-300 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">التقييم:</label>
                <select
                  value={editLogGrade}
                  onChange={(e) => setEditLogGrade(e.target.value as TeacherGrade)}
                  className="w-full p-2 rounded-xl border border-stone-300 font-bold text-stone-900 bg-stone-50"
                >
                  <option value="ممتاز">ممتاز ⭐⭐⭐⭐⭐</option>
                  <option value="جيد جداً">جيد جداً ⭐⭐⭐⭐</option>
                  <option value="جيد">جيد ⭐⭐⭐</option>
                  <option value="مقبول">مقبول ⭐⭐</option>
                  <option value="يحتاج إعادة">يحتاج إعادة 🔄</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">التاريخ:</label>
                <input
                  type="date"
                  value={editLogDate}
                  onChange={(e) => setEditLogDate(e.target.value)}
                  className="w-full p-2 rounded-xl border border-stone-300 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">ملاحظة وتوجيه الإدارة / المعلم:</label>
                <textarea
                  value={editLogNotes}
                  onChange={(e) => setEditLogNotes(e.target.value)}
                  rows={2}
                  placeholder="ملاحظات وتوجيهات..."
                  className="w-full p-2 rounded-xl border border-stone-300 font-medium"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingLog(null)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 font-bold text-stone-700 hover:bg-stone-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold shadow-xs"
                >
                  حفظ التعديل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reusable Delete Dialog */}
      <DeleteConfirmDialog
        isOpen={deleteDialog.isOpen}
        title={
          deleteDialog.type === 'wipe_all'
            ? 'تأكيد مسح وتفريغ كافة البيانات'
            : deleteDialog.type === 'wipe_all_stars'
            ? 'تأكيد مسح وتصفير جميع النجوم للجميع'
            : deleteDialog.type === 'wipe_all_logs'
            ? 'تأكيد مسح سجل التسميع بالكامل للجميع'
            : 'تأكيد الحذف'
        }
        message={
          deleteDialog.type === 'wipe_all'
            ? 'هل أنت متأكد من رغبتك في تفريغ قاعدة البيانات بالكامل ومسح كل الطلاب والمعلمين والحلقات والسجلات؟ هذا الإجراء فوري ونهائي لتجهيز النظام للنشر.'
            : deleteDialog.type === 'wipe_all_stars'
            ? 'هل أنت متأكد من مسح وتصفير كافة النجوم لجميع الطلاب في كافة الحلقات؟ ستبقى سجلات التسميع والآيات المحفوظة كما هي وسيتم إعادة رصيد النجوم إلى (0 نجمة) لجميع الطلاب دون أي حذف لبياناتهم.'
            : deleteDialog.type === 'wipe_all_logs'
            ? 'هل أنت متأكد من مسح جميع سجلات التسميع والمراجعة لكافة الطلاب والمعلمين والإدارة بالكامل من النظام؟ سيتم حذف جميع الجلسات وتصفير عداد الجلسات، مع الحفاظ على الحلقات والطلاب وسجلات الحضور.'
            : 'هل أنت متأكد من رغبتك في إتمام عملية الحذف؟ لا يمكن التراجع عن هذا الإجراء.'
        }
        itemName={deleteDialog.name}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialog({ isOpen: false, type: 'class', id: '', name: '' })}
      />

      {/* Comprehensive Student Profile & Progress Modal */}
      <StudentProfileModal
        student={selectedStudentForProfile}
        isOpen={!!selectedStudentForProfile}
        onClose={() => setSelectedStudentForProfile(null)}
        onOpenLogModal={onOpenLogModal}
        onOpenParentMessage={onOpenParentMessage}
        currentRole="admin"
      />

      {/* Comprehensive Teacher Profile Modal */}
      <TeacherProfileModal
        teacher={selectedTeacherForProfile}
        isOpen={!!selectedTeacherForProfile}
        onClose={() => setSelectedTeacherForProfile(null)}
        onExport={() => {
          setExportSelectedTeacher(selectedTeacherForProfile);
          setExportSelectedHalaqah(null);
          setExportModalType('single_teacher');
          setIsExportModalOpen(true);
        }}
        onEditTeacher={(t) => {
          setEditingTeacher(t);
          setTNameInput(t.name);
          setTPhoneInput(t.phoneNumber);
          setTEmailInput(t.email || '');
          setTPinInput(t.passwordPin || '');
          setTHalaqahInput(t.halaqahName);
          setIsAddTeacherOpen(true);
          setActiveTab('teachers');
        }}
        onSelectStudent={(st) => {
          setSelectedStudentForProfile(st);
        }}
        onOpenHalaqah={(hName) => {
          const found = halaqat.find((h) => h.name === hName);
          if (found) {
            setSelectedDrillHalaqah(found);
          }
        }}
      />

      {/* Export Format Selection Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => {
          setIsExportModalOpen(false);
          setExportSelectedHalaqah(null);
          setExportSelectedTeacher(null);
          setExportSelectedStudent(null);
        }}
        exportType={exportModalType}
        students={
          exportModalType === 'single_teacher' && exportSelectedTeacher
            ? students.filter(
                (s) =>
                  s.halaqahId === exportSelectedTeacher.halaqahId ||
                  s.halaqahName === exportSelectedTeacher.halaqahName
              )
            : exportSelectedHalaqah
            ? students.filter(
                (s) =>
                  s.halaqahId === exportSelectedHalaqah.id ||
                  s.halaqahName === exportSelectedHalaqah.name
              )
            : filteredStudents
        }
        teachers={teachers}
        classes={exportSelectedHalaqah ? [exportSelectedHalaqah] : halaqat}
        singleTeacher={exportSelectedTeacher}
        singleStudent={exportSelectedStudent}
        attendanceRecords={currentAttendanceRecordsForExport}
        className={
          exportSelectedHalaqah
            ? exportSelectedHalaqah.name
            : studentHalaqahFilter !== 'all'
            ? studentHalaqahFilter
            : undefined
        }
      />

      {/* Direct Attendance Modal for specific Halaqah */}
      {selectedAttendanceHalaqah && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-5 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold">
                  <UserCheck className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">حضور وغياب: {selectedAttendanceHalaqah.name}</h3>
                  <p className="text-xs text-stone-400">المعلم المسؤول: {selectedAttendanceHalaqah.teacherName || 'غير محدد'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAttendanceHalaqah(null);
                    setActiveTab('attendance');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  الانتقال لصفحة التحضير العام
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAttendanceHalaqah(null)}
                  className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
                  title="إغلاق"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 sm:p-5 overflow-y-auto flex-1">
              <AttendanceManager
                initialHalaqahId={selectedAttendanceHalaqah.id}
                teacherHalaqahName={selectedAttendanceHalaqah.name}
                lockHalaqah={true}
                readOnly={false}
                onAttendanceUpdated={onRefresh}
                onSelectStudent={(st) => setSelectedStudentForProfile(st)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

