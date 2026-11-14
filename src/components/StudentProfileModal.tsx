import React, { useState, useEffect } from 'react';
import { Student, SessionLog, SessionType, JuzInfo, JuzColorStatus } from '../types';
import {
  calculateStudentStats,
  calculateCompletedAjza,
  getLogs,
  getHalaqat,
  deleteLog,
  deleteStudentLogs,
  getStudentJuzColors,
  updateStudentJuzColor,
  JuzProgress,
} from '../utils/storage';
import { TOTAL_QURAN_AYAHS, QURAN_JUZS } from '../data/quranData';
import { ExportModal } from './ExportModal';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { SessionStarsBadge } from './SessionStarsBadge';
import { JuzDetailModal } from './JuzDetailModal';
import { ChatModal } from './ChatModal';
import { MonthlyReportCard } from './MonthlyReportCard';
import { GrowthChart } from './GrowthChart';
import { formatDateEn, formatNumberEn } from '../utils/format';
import {
  X,
  User,
  BookOpen,
  RotateCcw,
  Calendar,
  Award,
  KeyRound,
  School,
  TrendingUp,
  PlusCircle,
  CheckCircle2,
  Clock,
  Layers,
  ChevronRight,
  Download,
  Trash2,
  Star,
  Palette,
} from 'lucide-react';

interface StudentProfileModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenLogModal?: (student: Student, type?: SessionType) => void;
  onSelectJuzDetail?: (juz: JuzInfo) => void;
  currentRole?: 'admin' | 'teacher' | 'student';
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  student,
  isOpen,
  onClose,
  onOpenLogModal,
  onSelectJuzDetail,
  currentRole = 'admin' as 'admin' | 'teacher' | 'student',
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'ajza' | 'logs' | 'report'>('overview');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<string>('');
  const [deleteTargetLog, setDeleteTargetLog] = useState<SessionLog | null>(null);
  const [isClearAllLogsOpen, setIsClearAllLogsOpen] = useState(false);
  const [selectedJuzForDetail, setSelectedJuzForDetail] = useState<JuzInfo | null>(null);
  const [selectedJuzForColor, setSelectedJuzForColor] = useState<JuzProgress | null>(null);
  const [localJuzColors, setLocalJuzColors] = useState<Record<number, JuzColorStatus>>(() =>
    student ? student.juzColors || getStudentJuzColors(student.id) || {} : {}
  );

  useEffect(() => {
    if (student) {
      setLocalJuzColors(student.juzColors || getStudentJuzColors(student.id) || {});
    }
  }, [student]);

  useEffect(() => {
    const handleSync = () => {
      if (student) {
        setLocalJuzColors(getStudentJuzColors(student.id));
      }
    };
    window.addEventListener('tahfeeth_data_updated', handleSync);
    return () => window.removeEventListener('tahfeeth_data_updated', handleSync);
  }, [student]);

  if (!isOpen || !student) return null;

  const targetRole: 'admin' | 'teacher' | 'student' = currentRole || 'admin';
  const canEditColor = targetRole === 'teacher';

  const handleSetJuzColor = (juzNumber: number, color: JuzColorStatus | null) => {
    if (!student) return;
    const updated = updateStudentJuzColor(student.id, juzNumber, color);
    setLocalJuzColors({ ...updated });
    const colorNames: Record<string, string> = {
      yellow: 'أصفر: تم الحفظ',
      blue: 'أزرق: تم المراجعة',
      green: 'أخضر: تم التثبيت',
    };
    if (color && color !== 'yellow') {
      setActionMessage(`تم تعيين حالة ولون الجزء ${juzNumber} إلى: ${colorNames[color]}`);
    } else {
      setActionMessage(`تم حذف اللون وإعادة الجزء ${juzNumber} إلى اللون الأصفر`);
    }
    setTimeout(() => setActionMessage(''), 2500);
  };

  const getEffectiveColor = (juzNumber: number, progressPct: number): JuzColorStatus | undefined => {
    // If the juz has not been completed, it cannot have a color
    if (progressPct < 100) {
      return undefined;
    }
    const val = localJuzColors[juzNumber];
    if (val === 'blue' || val === 'green' || val === 'yellow') {
      return val;
    }
    // When student finishes a juz (progress reaches 100%), make the color yellow directly!
    return 'yellow';
  };

  const stats = calculateStudentStats(student.id);
  const ajzaProgress: JuzProgress[] = calculateCompletedAjza(student.id);
  const rawStudentLogs: SessionLog[] = getLogs(student.id);
  // Student's full log history is preserved for the student and never deleted when teacher deletes from teacher dashboard
  const studentLogs: SessionLog[] = rawStudentLogs.filter((log) => !log.hiddenForStudent);
  const halaqat = getHalaqat();
  const studentHalaqah = halaqat.find(
    (h) => h.id === student.halaqahId || h.name === student.halaqahName
  );

  const lastLog = studentLogs.length > 0 ? studentLogs[0] : null;

  const handleConfirmDeleteSingleLog = () => {
    if (deleteTargetLog) {
      deleteLog(deleteTargetLog.id, targetRole);
      setDeleteTargetLog(null);
      setActionMessage('تم حذف جلسة التسميع بنجاح');
      setTimeout(() => setActionMessage(''), 2500);
    }
  };

  const handleConfirmClearAllLogs = () => {
    deleteStudentLogs(student.id, targetRole);
    setIsClearAllLogsOpen(false);
    setActionMessage('تم حذف كامل سجل التسميع بنجاح');
    setTimeout(() => setActionMessage(''), 2500);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-stone-950/80 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div
        id="student-profile-modal"
        className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] my-auto flex flex-col shadow-2xl border border-stone-200 overflow-hidden text-right"
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="relative p-4 sm:p-6 bg-gradient-to-l from-emerald-900 via-emerald-950 to-stone-900 text-white shrink-0 pl-12 sm:pl-16">
          {/* Top Left Close Button (pinned to top left on all devices, exactly like teacher modal) */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 left-3 sm:top-5 sm:left-5 z-20 p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-stone-200 hover:text-white transition-all cursor-pointer shadow-xs"
            aria-label="إغلاق"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Student Info Container */}
          <div className="space-y-1.5 min-w-0">
            {/* Top: Badge ملف الطالب الشامل (same size as teacher modal badge) */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
                ملف الطالب الشامل
              </span>
            </div>

            {/* Middle: Student Name (fits screen on mobile, landscape flip, and tablet) */}
            <h2 className="text-base xs:text-lg sm:text-2xl font-black text-amber-300 flex items-center gap-2 pt-0.5 leading-snug">
              <User className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 shrink-0" />
              <span className="truncate">{student.fullName}</span>
            </h2>

            {/* Bottom: Student Class Under Name (same design as teacher modal) */}
            <div className="flex items-center gap-1.5 text-xs text-emerald-100/90 pt-0.5">
              <School className="w-4 h-4 text-emerald-400 shrink-0" />
              <strong className="text-white font-bold">{student.halaqahName || "غير محدد"}</strong>
            </div>
          </div>
        </div>

        {/* Modal Sub-Tabs */}
        <div className="bg-stone-100 border-b border-stone-200 px-5 py-2 flex items-center gap-1.5 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-white text-emerald-950 shadow-xs border border-stone-200'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            نظرة عامة
          </button>
          <button
            onClick={() => setActiveTab('growth')}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'growth'
                ? 'bg-white text-emerald-950 shadow-xs border border-stone-200'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
            <span>النمو البياني</span>
          </button>
          <button
            onClick={() => setActiveTab('ajza')}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'ajza'
                ? 'bg-white text-emerald-950 shadow-xs border border-stone-200'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            خريطة الأجزاء الثلاثين ({stats.completedAjzaCount}/30)
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'logs'
                ? 'bg-white text-emerald-950 shadow-xs border border-stone-200'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            سجل التسميع ({studentLogs.length})
          </button>
          {currentRole === 'admin' && (
            <button
              onClick={() => setActiveTab('report')}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'report'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-emerald-800 hover:text-emerald-950 bg-emerald-50/80 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>التقرير الشهري</span>
            </button>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-stone-50">
          {/* Key Metric Stats Cards - Always visible for comprehensive student overview */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-stone-500 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                الحفظ المعتمد
              </span>
              <div className="text-xl font-black text-stone-900">
                {stats.totalMemorizedAyahs}{' '}
                <span className="text-xs text-stone-400 font-normal">آية</span>
              </div>
              <div className="text-[10px] font-bold text-emerald-700">
                {stats.memorizedPercentage}% من القرآن الكريم
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-stone-500 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                السور المحفوظة
              </span>
              <div className="text-xl font-black text-emerald-950">
                {stats.completedSurahsCount}{' '}
                <span className="text-xs text-stone-400 font-normal">/ 114</span>
              </div>
              <div className="text-[10px] text-emerald-700 font-bold">
                سور تامة الحفظ
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-stone-500 flex items-center gap-1">
                <RotateCcw className="w-3.5 h-3.5 text-teal-700" />
                المراجعة والتثبيت
              </span>
              <div className="text-xl font-black text-stone-900">
                {stats.totalReviewedAyahs}{' '}
                <span className="text-xs text-stone-400 font-normal">آية</span>
              </div>
              <div className="text-[10px] text-stone-500">تمت مراجعتها وإتقانها</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-stone-500 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                مجموع النجوم
              </span>
              <div className="text-xl font-black text-amber-900 flex items-center gap-1">
                <span>{formatNumberEn(stats.totalStars)}</span>
                <span className="text-xs font-bold text-amber-700">نجمة</span>
              </div>
              <div className="text-[10px] text-amber-800">نقاط التسميع والانضباط</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-stone-500 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-600" />
                الأجزاء المكتملة
              </span>
              <div className="text-xl font-black text-amber-700">
                {stats.completedAjzaCount}{' '}
                <span className="text-xs text-stone-400 font-normal">/ 30</span>
              </div>
              <div className="text-[10px] text-stone-500">أجزاء تامة الإتقان</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-stone-500 flex items-center gap-1" title="يُحسب للأسبوع الحالي فقط (الأحد - الأربعاء) ويتجدد أسبوعياً">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                حضور وغياب (أسبوعياً)
              </span>
              <div className="text-xl font-black text-emerald-800">
                {formatNumberEn(stats.totalPresent)}{' '}
                <span className="text-xs text-stone-400 font-normal">حضور</span>
              </div>
              <div className="text-[10px] text-stone-500">
                {stats.totalAbsents > 0 ? (
                  <span className="text-rose-700 font-bold">{formatNumberEn(stats.totalAbsents)} غياب</span>
                ) : (
                  'لا يوجد غياب'
                )}{' '}
                • يتجدد أسبوعياً
              </div>
            </div>
          </div>

          {/* TAB 1: Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Surah Stopped At (السورة التي يقف عندها الطالب) */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs sm:text-sm text-stone-500 font-bold block">السورة التي يقف عندها الطالب:</span>
                  <h3 className="text-xl sm:text-2xl font-black text-stone-900 mt-1">
                    {(() => {
                      const name = (student.lastSurahStoppedAt || stats.currentSurahName || "").trim();
                      if (!name || name.includes("لا يوجد")) return name || "الفاتحة";
                      if (name.startsWith("سورة")) return name;
                      return `سورة ${name}`;
                    })()}
                  </h3>
                </div>
                <div className="p-3 sm:p-3.5 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                  <BookOpen className="w-6 h-6" />
                </div>
              </div>

              {/* Student Growth Chart (النمو البياني للطالب فقط) */}
              <GrowthChart
                studentId={student.id}
                compact={true}
                title="النمو البياني لإنجاز الطالب"
                timelineLabel="النمو البياني"
                hideComparison={true}
              />
            </div>
          )}

          {/* TAB: Growth Chart (النمو البياني للطالب فقط) */}
          {activeTab === 'growth' && (
            <div className="space-y-4">
              <GrowthChart
                studentId={student.id}
                title="النمو التراكمي لطالب"
                timelineLabel="النمو البياني"
                hideComparison={true}
              />
            </div>
          )}

          {actionMessage && (
            <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>{actionMessage}</span>
            </div>
          )}

          {/* TAB: Ajza Map */}
          {activeTab === 'ajza' && (
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3 flex-wrap gap-2">
                <div>
                  <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-700" />
                    <span>خريطة الأجزاء القرآنية الثلاثين</span>
                  </h3>

                </div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-900 rounded-xl text-xs font-bold">
                  {stats.completedAjzaCount} من 30 جزء مكتمل
                </span>
              </div>

              {/* Color Guide / Legend */}
              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-stone-700 flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-emerald-700" />
                    <span>دليل حالات الأجزاء:</span>
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-950">
                    <span className="w-3.5 h-3.5 rounded-full bg-amber-400 shrink-0 border border-amber-500 shadow-2xs" />
                    <span className="font-black">أصفر:</span>
                    <span className="text-[11px] font-bold text-amber-900">تم الحفظ</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-sky-50 border border-sky-200 text-sky-950">
                    <span className="w-3.5 h-3.5 rounded-full bg-sky-500 shrink-0 border border-sky-600 shadow-2xs" />
                    <span className="font-black">أزرق:</span>
                    <span className="text-[11px] font-bold text-sky-900">تم المراجعة</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950">
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shrink-0 border border-emerald-600 shadow-2xs" />
                    <span className="font-black">أخضر:</span>
                    <span className="text-[11px] font-bold text-emerald-900">تم التثبيت</span>
                  </div>
                </div>
              </div>

              {/* 30 Ajza Interactive Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {ajzaProgress.map((j) => {
                  const isDone = j.progressPercentage >= 100;
                  const assignedColor = getEffectiveColor(j.juzNumber, j.progressPercentage);

                  const cardBgClass =
                    assignedColor === 'yellow'
                      ? 'bg-amber-100/80 border-2 border-amber-400 hover:border-amber-500 shadow-xs'
                      : assignedColor === 'blue'
                      ? 'bg-sky-100/80 border-2 border-sky-400 hover:border-sky-500 shadow-xs'
                      : assignedColor === 'green'
                      ? 'bg-emerald-100/80 border-2 border-emerald-400 hover:border-emerald-500 shadow-xs'
                      : 'bg-stone-50 border-stone-200 hover:border-stone-300';

                  return (
                    <button
                      key={j.juzNumber}
                      type="button"
                      onClick={() => {
                        setSelectedJuzForDetail(j.juzInfo);
                        if (onSelectJuzDetail) onSelectJuzDetail(j.juzInfo);
                      }}
                      className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between min-h-28 h-auto cursor-pointer relative group ${cardBgClass}`}
                      title={`الجزء ${j.juzNumber} — انقر لعرض التفاصيل وحالة الجزء`}
                    >
                      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between w-full gap-1">
                        <span className="text-xs font-black text-stone-900 leading-tight">
                          الجزء {j.juzNumber}
                        </span>

                        {assignedColor === 'yellow' ? (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-amber-200 text-amber-950 border border-amber-300 shadow-2xs leading-none">
                            تم الحفظ
                          </span>
                        ) : assignedColor === 'blue' ? (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-sky-200 text-sky-950 border border-sky-300 shadow-2xs leading-none">
                            تم المراجعة
                          </span>
                        ) : assignedColor === 'green' ? (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-200 text-emerald-950 border border-emerald-300 shadow-2xs leading-none">
                            تم التثبيت
                          </span>
                        ) : null}
                      </div>

                      <div className="space-y-1 w-full">
                        <div className="flex justify-between text-[10px] text-stone-600 font-bold">
                          <span>{j.memorizedAyahs} آية</span>
                          <span>{j.progressPercentage}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-stone-200/90 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              assignedColor === 'yellow'
                                ? 'bg-amber-500'
                                : assignedColor === 'blue'
                                ? 'bg-sky-600'
                                : assignedColor === 'green'
                                ? 'bg-emerald-600'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${j.progressPercentage}%` }}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: Session Logs */}
          {activeTab === 'logs' && (
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3 flex-wrap gap-2">
                <div>
                  <h3 className="font-bold text-sm text-stone-900">
                    سجل التسميع والمراجعة للطالب ({studentLogs.length} جلسة)
                  </h3>
                  <span className="text-xs text-stone-500">معتمد من معلم الحلقة</span>
                </div>
              </div>

              {studentLogs.length === 0 ? (
                <div className="text-center py-10 text-stone-400 text-xs font-bold">
                  لم يتم تسجيل أي جلسات تسميع
                </div>
              ) : (
                <div className="space-y-3">
                  {studentLogs.map((log) => {
                    const isCombined = log.type === 'combined';
                    const isHifz = log.type === 'hifz';

                    return (
                      <div
                        key={log.id}
                        className="p-3.5 rounded-xl border border-stone-200 bg-white hover:border-emerald-300 transition-all space-y-2"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isCombined
                                  ? 'bg-emerald-900 text-amber-300'
                                  : isHifz
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-teal-100 text-teal-800'
                              }`}
                            >
                              {isCombined
                                ? 'حفظ + مراجعة'
                                : isHifz
                                ? 'حفظ جديد'
                                : `مراجعة (${log.reviewType || 'قريبة'})`}
                            </span>

                            {isCombined ? (
                              <span className="font-bold text-stone-900 text-xs">
                                🟢 حفظ: {log.isSurahRange ? `من سورة ${log.fromSurahName || log.surahName} إلى سورة ${log.toSurahName || log.surahName} (${log.ayahsCount} آية)` : `سورة ${log.surahName} (${log.startAyah}-${log.endAyah})`} • 🔵 مراجعة: {log.murajaahIsSurahRange ? `من سورة ${log.murajaahFromSurahName} إلى سورة ${log.murajaahToSurahName}` : `سورة ${log.murajaahSurahName || log.surahName} (${log.murajaahStartAyah || 1}-${log.murajaahEndAyah || 1})`}
                              </span>
                            ) : (
                              <span className="font-bold text-stone-900 text-xs">
                                {log.isSurahRange
                                  ? `من سورة ${log.fromSurahName || log.surahName} إلى سورة ${log.toSurahName || log.surahName} • ${log.ayahsCount} آية (${log.surahsIncluded?.length || 0} سور)`
                                  : `سورة ${log.surahName} (الآيات ${log.startAyah} - ${log.endAyah}) • ${log.ayahsCount} آية`}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                            <SessionStarsBadge
                              points={log.evaluationPoints}
                              totalStars={log.totalStars}
                              teacherGrade={log.teacherGrade}
                              size="xs"
                              showDetailsToggle={true}
                            />
                            {log.teacherGrade && (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                                {log.teacherGrade}
                              </span>
                            )}
                            <span className="text-xs text-stone-400">
                              {formatDateEn(log.date)}
                            </span>
                            {currentRole === 'student' && (
                              <button
                                onClick={() => setDeleteTargetLog(log)}
                                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="حذف جلسة التسميع"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {log.teacherNotes && (
                          <div className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                            <strong>ملاحظات المعلم:</strong> {log.teacherNotes}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Monthly Report Card (Admin only) */}
          {activeTab === 'report' && currentRole === 'admin' && (
            <div className="space-y-4">
              <MonthlyReportCard student={student} currentRole="admin" />
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Export Format Selection Modal */}
    <ExportModal
      isOpen={isExportModalOpen}
      onClose={() => setIsExportModalOpen(false)}
      exportType="single_student"
      singleStudent={student}
    />

    {/* Single Log Delete Confirmation Dialog */}
    <DeleteConfirmDialog
      isOpen={!!deleteTargetLog}
      title="حذف جلسة التسميع"
      message="هل أنت متأكد من رغبتك في حذف جلسة التسميع هذه نهائياً؟"
      itemName={deleteTargetLog ? `${student.fullName} — ${deleteTargetLog.surahName} (${deleteTargetLog.date})` : undefined}
      onConfirm={handleConfirmDeleteSingleLog}
      onCancel={() => setDeleteTargetLog(null)}
    />

    {/* Clear All Logs Confirmation Dialog */}
    <DeleteConfirmDialog
      isOpen={isClearAllLogsOpen}
      title="حذف كامل سجل التسميع"
      message="هل أنت متأكد من رغبتك في حذف جميع جلسات التسميع لهذا الطالب نهائياً؟"
      itemName={`سجل الطالب: ${student.fullName} (${studentLogs.length} جلسة)`}
      onConfirm={handleConfirmClearAllLogs}
      onCancel={() => setIsClearAllLogsOpen(false)}
    />

    {/* Simple Teacher/Admin Juz Color Chooser Modal - 3 options only (Blue, Green, Yellow) */}
    {selectedJuzForColor && (
      <div
        className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-xs animate-in fade-in"
        onClick={() => setSelectedJuzForColor(null)}
      >
        <div
          className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-stone-200 space-y-4 animate-in zoom-in-95 text-right"
          dir="rtl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h3 className="font-black text-base text-stone-900">
                الجزء {selectedJuzForColor.juzNumber}: {selectedJuzForColor.juzInfo.name}
              </h3>
              <p className="text-xs text-stone-500 font-medium">
                اختر حالة ولون الجزء للطالب ({student.fullName}):
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedJuzForColor(null)}
              className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {/* 1. Blue: أزرق (تم المراجعة) */}
            <button
              type="button"
              onClick={() => {
                handleSetJuzColor(selectedJuzForColor.juzNumber, 'blue');
                setSelectedJuzForColor(null);
              }}
              className={`w-full p-3.5 rounded-2xl border-2 text-right transition-all flex items-center justify-between cursor-pointer ${
                getEffectiveColor(selectedJuzForColor.juzNumber, selectedJuzForColor.progressPercentage) === 'blue'
                  ? 'bg-sky-100 border-sky-500 ring-2 ring-sky-400/40 shadow-xs'
                  : 'bg-sky-50/80 border-sky-300 hover:bg-sky-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-sky-500 border border-sky-600 shrink-0 shadow-xs" />
                <span className="font-black text-sm text-sky-950">أزرق: تم المراجعة</span>
              </div>
              {getEffectiveColor(selectedJuzForColor.juzNumber, selectedJuzForColor.progressPercentage) === 'blue' && (
                <CheckCircle2 className="w-5 h-5 text-sky-700 shrink-0" />
              )}
            </button>

            {/* 2. Green: أخضر (تم التثبيت) */}
            <button
              type="button"
              onClick={() => {
                handleSetJuzColor(selectedJuzForColor.juzNumber, 'green');
                setSelectedJuzForColor(null);
              }}
              className={`w-full p-3.5 rounded-2xl border-2 text-right transition-all flex items-center justify-between cursor-pointer ${
                getEffectiveColor(selectedJuzForColor.juzNumber, selectedJuzForColor.progressPercentage) === 'green'
                  ? 'bg-emerald-100 border-emerald-500 ring-2 ring-emerald-400/40 shadow-xs'
                  : 'bg-emerald-50/80 border-emerald-300 hover:bg-emerald-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-500 border border-emerald-600 shrink-0 shadow-xs" />
                <span className="font-black text-sm text-emerald-950">أخضر: تم التثبيت</span>
              </div>
              {getEffectiveColor(selectedJuzForColor.juzNumber, selectedJuzForColor.progressPercentage) === 'green' && (
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
              )}
            </button>

            {/* 3. Yellow: أصفر (تم الحفظ) */}
            <button
              type="button"
              onClick={() => {
                handleSetJuzColor(selectedJuzForColor.juzNumber, 'yellow');
                setSelectedJuzForColor(null);
              }}
              className={`w-full p-3.5 rounded-2xl border-2 text-right transition-all flex items-center justify-between cursor-pointer ${
                getEffectiveColor(selectedJuzForColor.juzNumber, selectedJuzForColor.progressPercentage) === 'yellow'
                  ? 'bg-amber-100 border-amber-500 ring-2 ring-amber-400/40 shadow-xs'
                  : 'bg-amber-50/80 border-amber-300 hover:bg-amber-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-amber-400 border border-amber-500 shrink-0 shadow-xs" />
                <span className="font-black text-sm text-amber-950">أصفر: تم الحفظ</span>
              </div>
              {getEffectiveColor(selectedJuzForColor.juzNumber, selectedJuzForColor.progressPercentage) === 'yellow' && (
                <CheckCircle2 className="w-5 h-5 text-amber-700 shrink-0" />
              )}
            </button>

            {/* 4. Delete Color: حذف اللون وإعادته للأصفر */}
            <button
              type="button"
              onClick={() => {
                handleSetJuzColor(selectedJuzForColor.juzNumber, 'yellow');
                setSelectedJuzForColor(null);
              }}
              className="w-full p-3.5 rounded-2xl border border-stone-200 bg-stone-50 hover:bg-amber-50 hover:border-amber-300 text-stone-700 hover:text-amber-900 text-right transition-all flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <RotateCcw className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-bold text-sm">حذف اللون (إعادة إلى اللون الأصفر)</span>
              </div>
              <span className="text-[11px] text-amber-700 font-bold bg-amber-100/70 px-2 py-0.5 rounded-md">أصفر</span>
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Granular Juz Surahs & Completion Modal */}
    <JuzDetailModal
      isOpen={Boolean(selectedJuzForDetail)}
      onClose={() => setSelectedJuzForDetail(null)}
      juz={selectedJuzForDetail}
      studentId={student.id}
      student={student}
      logs={studentLogs}
      currentRole={targetRole}
      juzColor={selectedJuzForDetail ? localJuzColors[selectedJuzForDetail.juzNumber] : undefined}
      onSetJuzColor={
        canEditColor
          ? (color) => {
              if (selectedJuzForDetail) {
                handleSetJuzColor(selectedJuzForDetail.juzNumber, color);
              }
            }
          : undefined
      }
      onSelectSurahForLog={
        canEditColor
          ? (_sNum) => {
              setSelectedJuzForDetail(null);
              if (onOpenLogModal) onOpenLogModal(student, 'hifz');
            }
          : undefined
      }
    />

    {/* Direct Chat with Student Modal for Teacher */}
    {isChatOpen && student && (
      <ChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        currentRole="teacher"
        teacherStudents={[student]}
        initialTargetStudentId={student.id}
      />
    )}
  </>
  );
};
