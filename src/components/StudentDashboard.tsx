import React, { useState, useEffect } from 'react';
import { Student, SessionLog, JuzInfo } from '../types';
import {
  calculateStudentStats,
  calculateCompletedAjza,
  deleteLog,
  deleteStudentLogs,
  getUnreadMessagesCount,
  markConversationAsRead,
  JuzProgress,
} from '../utils/storage';
import { formatNumberEn, formatDateEn } from '../utils/format';
import { TOTAL_QURAN_AYAHS } from '../data/quranData';
import { LeaderboardView } from './LeaderboardView';
import { GrowthChart } from './GrowthChart';
import { SessionStarsBadge } from './SessionStarsBadge';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { ChatBox } from './ChatBox';
import { ChatModal } from './ChatModal';
import { MonthlyReportCard } from './MonthlyReportCard';
import {
  BookOpen,
  RotateCcw,
  CheckCircle2,
  Flame,
  Award,
  GraduationCap,
  Layers,
  Sparkles,
  Trophy,
  Star,
  XCircle,
  UserCheck,
  Palette,
  Trash2,
  MessageSquare,
  TrendingUp,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';

interface StudentDashboardProps {
  student: Student;
  logs: SessionLog[];
  onSelectJuzDetail: (juz: JuzInfo) => void;
  hideChat?: boolean;
  onBackToChildrenList?: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  student,
  logs,
  onSelectJuzDetail,
  hideChat = false,
  onBackToChildrenList,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'growth' | 'ajza' | 'logs' | 'chat' | 'leaderboard'>('overview');
  const [deleteTargetLog, setDeleteTargetLog] = useState<SessionLog | null>(null);
  const [isClearAllOpen, setIsClearAllOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(() =>
    getUnreadMessagesCount(student.id, 'student')
  );

  useEffect(() => {
    const handleUpdate = () => {
      if (activeTab === 'chat') {
        setUnreadChatCount(0);
      } else {
        setUnreadChatCount(getUnreadMessagesCount(student.id, 'student'));
      }
    };
    window.addEventListener('tahfeeth_data_updated', handleUpdate);
    return () => window.removeEventListener('tahfeeth_data_updated', handleUpdate);
  }, [student.id, activeTab]);

  useEffect(() => {
    if (activeTab === 'chat') {
      markConversationAsRead(student.id, '', 'student');
      setUnreadChatCount(0);
    }
  }, [activeTab, student.id]);

  const handleConfirmDeleteLog = () => {
    if (deleteTargetLog) {
      deleteLog(deleteTargetLog.id, 'student');
      setDeleteTargetLog(null);
    }
  };

  const handleConfirmClearAll = () => {
    deleteStudentLogs(student.id, 'student');
    setIsClearAllOpen(false);
  };

  const stats = calculateStudentStats(student.id);
  const ajzaProgress: JuzProgress[] = calculateCompletedAjza(student.id);
  // Filter out any logs soft-hidden for student
  const visibleLogs = logs.filter((l) => !l.hiddenForStudent);

  // Auto-delete and auto-reset when reaching 99 logs for student
  useEffect(() => {
    if (visibleLogs.length >= 99) {
      deleteStudentLogs(student.id, 'student');
    }
  }, [visibleLogs.length, student.id]);

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Student App Bar / Top Identity */}
      <div className="bg-gradient-to-r from-stone-900 via-emerald-950 to-stone-900 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl border border-stone-800">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs text-amber-300 font-semibold">{student.halaqahName || 'حلقة عامة'}</span>
            <h2 className="text-2xl sm:text-3xl font-black">{student.fullName}</h2>
          </div>
          {onBackToChildrenList && (
            <button
              type="button"
              onClick={onBackToChildrenList}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
              title="العودة لاختيار ابن آخر"
            >
              <span>قائمة الأبناء</span>
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs - Centered on desktop, smoothly scrollable back and forth on mobile/tablet */}
      <div className="flex items-center gap-1.5 p-1 bg-stone-200/80 rounded-2xl max-w-2xl mx-auto overflow-x-auto no-scrollbar touch-pan-x overscroll-x-contain scroll-smooth justify-start sm:justify-center">
        <button
          type="button"
          onClick={(e) => {
            setActiveTab('overview');
            e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
          }}
          className={`shrink-0 py-2 px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap text-center cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          نظرة عامة
        </button>
        <button
          type="button"
          onClick={(e) => {
            setActiveTab('growth');
            e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
          }}
          className={`shrink-0 py-2 px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1.5 text-center cursor-pointer ${
            activeTab === 'growth'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
          <span>النمو البياني</span>
        </button>
        <button
          type="button"
          onClick={(e) => {
            setActiveTab('ajza');
            e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
          }}
          className={`shrink-0 py-2 px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap text-center cursor-pointer ${
            activeTab === 'ajza'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          خريطة الأجزاء ({stats.completedAjzaCount}/30)
        </button>
        <button
          type="button"
          onClick={(e) => {
            setActiveTab('logs');
            e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
          }}
          className={`shrink-0 py-2 px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap text-center cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          سجل التسميع ({visibleLogs.length})
        </button>
        {!hideChat && (
          <button
            type="button"
            onClick={(e) => {
              setActiveTab('chat');
              e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }}
            className={`shrink-0 py-2 px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1.5 text-center cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
            <span>الدردشة</span>
            {activeTab !== 'chat' && unreadChatCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-400 text-amber-950 font-black text-[10px] flex items-center justify-center">
                {unreadChatCount}
              </span>
            )}
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            setActiveTab('leaderboard');
            e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
          }}
          className={`shrink-0 py-2 px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap text-center cursor-pointer ${
            activeTab === 'leaderboard'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          لوحة الشرف
        </button>
      </div>

      {/* 6 Key Metric Stats Cards - Only visible in Overview & Growth, hidden when clicking Ajza, Logs, Chat, or Leaderboard */}
      {(activeTab === 'overview' || activeTab === 'growth') && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3">
          {/* 1. الحفظ المعتمد */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-stone-500 flex items-center justify-between">
              <span>الحفظ المعتمد</span>
              <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
            </span>
            <div className="text-xl font-black text-stone-900">
              {formatNumberEn(stats.totalMemorizedAyahs)}{' '}
              <span className="text-xs text-stone-400 font-normal">آية</span>
            </div>
            <div className="text-[10px] font-bold text-emerald-700">
              {stats.memorizedPercentage}% من القرآن الكريم
            </div>
          </div>

          {/* 2. السور المحفوظة (Teal/Emerald Border & Accent) */}
          <div className="bg-white p-4 rounded-2xl border border-emerald-300 bg-emerald-50/20 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-stone-500 flex items-center justify-between">
              <span>السور المحفوظة</span>
              <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
            </span>
            <div className="text-xl font-black text-emerald-950 flex items-center gap-1">
              <span className="text-xs text-stone-400 font-normal">114 /</span>
              <span>{formatNumberEn(stats.completedSurahsCount)}</span>
            </div>
            <div className="text-[10px] text-emerald-700 font-bold">
              سور تامة الحفظ
            </div>
          </div>

          {/* 3. المراجعة والتثبيت */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-stone-500 flex items-center justify-between">
              <span>المراجعة والتثبيت</span>
              <RotateCcw className="w-3.5 h-3.5 text-teal-700" />
            </span>
            <div className="text-xl font-black text-stone-900">
              {formatNumberEn(stats.totalReviewedAyahs)}{' '}
              <span className="text-xs text-stone-400 font-normal">آية</span>
            </div>
            <div className="text-[10px] text-stone-500">تمت مراجعتها وإتقانها</div>
          </div>

          {/* 4. مجموع النجوم (Amber Border & Accent) */}
          <div className="bg-white p-4 rounded-2xl border border-amber-300 bg-amber-50/20 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-stone-500 flex items-center justify-between">
              <span>مجموع النجوم</span>
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            </span>
            <div className="text-xl font-black text-amber-900 flex items-center gap-1">
              <span>{formatNumberEn(stats.totalStars)}</span>
              <span className="text-xs font-bold text-amber-700">نجمة</span>
            </div>
            <div className="text-[10px] text-amber-800">نقاط التسميع والانضباط</div>
          </div>

          {/* 5. الأجزاء المكتملة */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-stone-500 flex items-center justify-between">
              <span>الأجزاء المكتملة</span>
              <Award className="w-3.5 h-3.5 text-amber-600" />
            </span>
            <div className="text-xl font-black text-amber-700 flex items-center gap-1">
              <span className="text-xs text-stone-400 font-normal">30 /</span>
              <span>{stats.completedAjzaCount}</span>
            </div>
            <div className="text-[10px] text-stone-500">أجزاء تامة الإتقان</div>
          </div>

          {/* 6. حضور وغياب (أسبوعياً) */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-stone-500 flex items-center justify-between" title="يُحسب للأسبوع الحالي فقط (الأحد - الأربعاء) ويتجدد أسبوعياً">
              <span>حضور وغياب (أسبوعياً)</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </span>
            <div className="text-xl font-black text-emerald-800 flex items-center gap-1">
              <span>{formatNumberEn(stats.totalPresent)}</span>
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
      )}

      {/* Tab: Direct Chat with Teacher */}
      {!hideChat && activeTab === 'chat' && (
        <div className="space-y-4">
          <ChatBox currentRole="student" currentStudent={student} />
        </div>
      )}

      {/* Tab: Leaderboard */}
      {activeTab === 'leaderboard' && (
        <LeaderboardView currentStudentId={student.id} />
      )}

      {/* Tab: Growth Chart */}
      {activeTab === 'growth' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <GrowthChart
            studentId={student.id}
            title="النمو التراكمي لطالب"
          />
        </div>
      )}

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Surah Stopped At (السورة التي يقف عندها الطالب) */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between gap-3">
            <div>
              <span className="text-xs sm:text-sm text-stone-500 font-bold block">السورة التي يقف عندها الطالب:</span>
              <h3 className="text-xl sm:text-2xl font-black text-stone-900 mt-1">
                {(() => {
                  const name = (student.lastSurahStoppedAt || stats.currentSurahName || "").trim();
                  if (!name || name.includes("لا يوجد")) return "الفاتحة";
                  if (name.startsWith("سورة")) return name;
                  return `سورة ${name}`;
                })()}
              </h3>
            </div>
            <div className="p-3 sm:p-3.5 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* Tab: Ajza (30) Visual Progress */}
      {activeTab === 'ajza' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3 flex-wrap gap-2">
            <div>
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-700" />
                <span>خريطة أجزاء القرآن الكريم</span>
              </h3>
            </div>
            <div className="text-xs font-black text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              {stats.completedAjzaCount} من 30 جزء مكتمل
            </div>
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

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-2">
            {ajzaProgress.map((j) => {
              const isDone = j.progressPercentage >= 100;
              const inProgress = j.progressPercentage > 0 && !isDone;
              const rawColor = student.juzColors?.[j.juzNumber];
              const assignedColor = !isDone
                ? undefined
                : rawColor === 'none'
                ? undefined
                : rawColor || 'yellow';

              const cardBgClass =
                assignedColor === 'yellow'
                  ? 'bg-amber-50/90 border-2 border-amber-400 hover:border-amber-500 shadow-xs'
                  : assignedColor === 'blue'
                  ? 'bg-sky-50/90 border-2 border-sky-400 hover:border-sky-500 shadow-xs'
                  : assignedColor === 'green'
                  ? 'bg-emerald-50/90 border-2 border-emerald-400 hover:border-emerald-500 shadow-xs'
                  : inProgress
                  ? 'bg-amber-50/50 border-amber-200 hover:border-amber-400'
                  : 'bg-stone-50 border-stone-200 hover:border-stone-300';

              return (
                <button
                  key={j.juzNumber}
                  type="button"
                  onClick={() => onSelectJuzDetail(j.juzInfo)}
                  className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between min-h-28 h-auto cursor-pointer ${cardBgClass}`}
                >
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between w-full gap-1">
                    <span className="text-xs font-black text-stone-900 leading-tight">
                      الجزء {j.juzNumber}
                    </span>

                    {assignedColor === 'yellow' ? (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-amber-200 text-amber-950 border border-amber-300 leading-none">
                        تم الحفظ
                      </span>
                    ) : assignedColor === 'blue' ? (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-sky-200 text-sky-950 border border-sky-300 leading-none">
                        تم المراجعة
                      </span>
                    ) : assignedColor === 'green' ? (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-200 text-emerald-950 border border-emerald-300 leading-none">
                        تم التثبيت
                      </span>
                    ) : isDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    ) : null}
                  </div>

                  <div className="space-y-1 w-full">
                    <div className="flex justify-between text-[10px] text-stone-600 font-bold">
                      <span>{j.memorizedAyahs} آية</span>
                      <span>{j.progressPercentage}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          assignedColor === 'yellow'
                            ? 'bg-amber-500'
                            : assignedColor === 'blue'
                            ? 'bg-sky-600'
                            : assignedColor === 'green' || isDone
                            ? 'bg-emerald-600'
                            : 'bg-amber-600'
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

      {/* Tab: Full History Logs */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3 flex-wrap gap-2">
            <div>
              <h3 className="text-base font-bold text-stone-900">سجل التسميع والمراجعة الكامل ({visibleLogs.length})</h3>
            </div>
            {visibleLogs.length > 0 && (
              <button
                type="button"
                onClick={() => setIsClearAllOpen(true)}
                className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="حذف كامل سجل التسميع الخاص بي"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>حذف كل السجل</span>
              </button>
            )}
          </div>

          {visibleLogs.length === 0 ? (
            <div className="text-center py-12 text-stone-400 text-xs">
              لم يتم تسجيل أي جلسات تسميع
            </div>
          ) : (
            <div className="space-y-3">
              {visibleLogs.map((log) => {
                const isCombined = log.type === 'combined';
                const isHifz = log.type === 'hifz';

                return (
                  <div
                    key={log.id}
                    className="p-4 rounded-xl border border-stone-200 bg-white hover:border-emerald-300 transition-all space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
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
                          <span className="font-extrabold text-stone-900 text-sm">
                            🟢 حفظ: سورة {log.surahName} ({log.startAyah}-{log.endAyah}) • 🔵 مراجعة: سورة {log.murajaahSurahName || log.surahName} ({log.murajaahStartAyah || 1}-{log.murajaahEndAyah || 1})
                          </span>
                        ) : (
                          <span className="font-extrabold text-stone-900 text-sm">
                            سورة {log.surahName} (الآيات {log.startAyah} إلى {log.endAyah}) • {log.ayahsCount} آية
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
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                            {log.teacherGrade}
                          </span>
                        )}
                        <span className="text-xs text-stone-400">
                          {formatDateEn(log.date)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setDeleteTargetLog(log)}
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="حذف جلسة التسميع هذه من سجلي"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {log.teacherNotes && (
                      <div className="text-xs text-stone-700 bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                        <span className="font-bold text-stone-900">ملاحظات المعلم: </span>
                        {log.teacherNotes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialogs for Student */}
      <DeleteConfirmDialog
        isOpen={!!deleteTargetLog}
        title="حذف جلسة التسميع"
        message="هل أنت متأكد من رغبتك في حذف جلسة التسميع هذه من سجلك؟"
        itemName={deleteTargetLog ? `${deleteTargetLog.surahName} (${deleteTargetLog.date})` : undefined}
        onConfirm={handleConfirmDeleteLog}
        onCancel={() => setDeleteTargetLog(null)}
      />

      <DeleteConfirmDialog
        isOpen={isClearAllOpen}
        title="حذف كامل سجل التسميع"
        message="هل أنت متأكد من رغبتك في حذف كامل سجل التسميع الخاص بك نهائياً؟"
        itemName={`سجل التسميع الخاص بي (${visibleLogs.length} جلسة)`}
        onConfirm={handleConfirmClearAll}
        onCancel={() => setIsClearAllOpen(false)}
      />

      {/* Direct Chat with Teacher Modal */}
      <ChatModal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        currentRole="student"
        currentStudent={student}
      />
    </div>
  );
};

