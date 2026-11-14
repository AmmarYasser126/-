import React, { useState } from 'react';
import {
  HalaqahClass,
  Student,
} from '../types';
import {
  getStudents,
  getLogs,
  calculateStudentStats,
  calculateCompletedSurahs,
  calculateWeeklyHalaqahAttendance,
} from '../utils/storage';
import { formatNumberEn, formatDateEn } from '../utils/format';
import { GrowthChart } from './GrowthChart';
import { SessionStarsBadge } from './SessionStarsBadge';
import {
  X,
  Users,
  BookOpen,
  TrendingUp,
  Award,
  Sparkles,
  CheckCircle2,
  Eye,
  FileCheck,
  Calendar,
  BookmarkCheck,
  FileSpreadsheet,
} from 'lucide-react';

interface HalaqahDetailModalProps {
  halaqah: HalaqahClass;
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  onSelectStudent?: (student: Student) => void;
  onOpenParentMessage?: (student: Student, log: any) => void;
  onOpenParentMessageModal?: (student: Student, log: any) => void;
  onOpenAttendance?: (halaqahId: string) => void;
  onExport?: () => void;
  onDataChanged?: () => void;
  onRefresh?: () => void;
}

export const HalaqahDetailModal: React.FC<HalaqahDetailModalProps> = ({
  halaqah,
  isOpen,
  onClose,
  isAdmin = true,
  onSelectStudent,
  onOpenParentMessage,
  onOpenParentMessageModal,
  onOpenAttendance,
  onExport,
  onDataChanged,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'logs'>('overview');

  if (!isOpen) return null;

  const allStudents = getStudents();
  const halaqahStudents = allStudents.filter(
    (s) => s.halaqahId === halaqah.id || s.halaqahName === halaqah.name
  );

  const totalAyahsMemorized = halaqahStudents.reduce((sum, s) => {
    return sum + calculateStudentStats(s.id).totalMemorizedAyahs;
  }, 0);

  const totalAyahsReviewed = halaqahStudents.reduce((sum, s) => {
    return sum + calculateStudentStats(s.id).totalReviewedAyahs;
  }, 0);

  const totalCompletedSurahsCount = halaqahStudents.reduce((sum, s) => {
    return sum + calculateCompletedSurahs(s.id).completedCount;
  }, 0);

  const halaqahStudentIds = halaqahStudents.map((s) => s.id);
  const weeklyAttendance = calculateWeeklyHalaqahAttendance(halaqahStudentIds, halaqah.id);

  // Recitation logs for all students in this halaqah (filtered so deleting logs resets to 0)
  const allLogs = getLogs();
  const halaqahLogs = allLogs.filter((l) =>
    halaqahStudents.some((s) => s.id === l.studentId) &&
    (isAdmin ? !l.hiddenForAdmin : !l.hiddenForTeacher)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-stone-950/80 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div
        id="halaqah-detail-modal"
        className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] my-auto flex flex-col shadow-2xl border border-stone-200 overflow-hidden text-right"
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="relative p-4 sm:p-6 bg-gradient-to-l from-emerald-900 via-emerald-950 to-stone-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0 pl-12 sm:pl-14">
          {/* Top Left Close / Cancel Button */}
          <button
            onClick={onClose}
            className="absolute top-3 left-3 sm:top-5 sm:left-5 z-20 p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-stone-200 hover:text-white transition-all cursor-pointer shadow-xs"
            aria-label="إغلاق النافذة"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-black text-amber-300">
              {halaqah.name}
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-xs text-emerald-100/90 mt-2">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" />
                المعلم: <strong className="text-white">{halaqah.teacherName || 'غير محدد'}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Modal Tabs Bar */}
        <div className="flex items-center gap-2 border-b border-stone-200 px-5 sm:px-6 bg-stone-50 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'overview'
                ? 'border-emerald-700 text-emerald-800'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>الطلاب والنمو البياني ({formatNumberEn(halaqahStudents.length)})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`py-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'logs'
                ? 'border-emerald-700 text-emerald-800'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <FileCheck className="w-4 h-4 text-amber-600" />
            <span>سجل التسميع ({formatNumberEn(halaqahLogs.length)})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-stone-50">
          {/* TAB 1: Growth Graphs & Students List */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Performance Metrics Row (5 Cards) - Exactly like Teacher Modal */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                  <div className="flex items-center justify-between text-xs text-emerald-800 font-bold">
                    <span>طلاب الحلقة</span>
                    <Users className="w-4 h-4 text-emerald-700" />
                  </div>
                  <div className="text-2xl font-black text-emerald-950">
                    {formatNumberEn(halaqahStudents.length)}
                  </div>
                  <div className="text-[11px] text-emerald-700">طالب مقيد بالحلقة</div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
                  <div className="flex items-center justify-between text-xs text-amber-800 font-bold">
                    <span>جلسات التسميع</span>
                    <BookOpen className="w-4 h-4 text-amber-700" />
                  </div>
                  <div className="text-2xl font-black text-amber-950">
                    {formatNumberEn(halaqahLogs.length)}
                  </div>
                  <div className="text-[11px] text-amber-700">جلسة مسجلة ومعتمدة</div>
                </div>

                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
                  <div className="flex items-center justify-between text-xs text-stone-700 font-bold">
                    <span>آيات الحفظ المنجزة</span>
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-stone-900">
                    {formatNumberEn(totalAyahsMemorized)}
                  </div>
                  <div className="text-[11px] text-stone-500">آية لجميع الطلاب</div>
                </div>

                <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 space-y-1">
                  <div className="flex items-center justify-between text-xs text-teal-800 font-bold">
                    <span>آيات المراجعة</span>
                    <Award className="w-4 h-4 text-teal-700" />
                  </div>
                  <div className="text-2xl font-black text-teal-950">
                    {formatNumberEn(totalAyahsReviewed)}
                  </div>
                  <div className="text-[11px] text-teal-700">آية تمت مراجعتها</div>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-1 col-span-2 sm:col-span-1">
                  <div className="flex items-center justify-between text-xs text-indigo-800 font-bold">
                    <span>عدد سور الحفظ</span>
                    <BookmarkCheck className="w-4 h-4 text-indigo-700" />
                  </div>
                  <div className="text-2xl font-black text-indigo-950">
                    {formatNumberEn(totalCompletedSurahsCount)}
                  </div>
                  <div className="text-[11px] text-indigo-700">سورة مكتملة لطلاب الحلقة</div>
                </div>
              </div>
              {/* Growth Charts */}
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-stone-900 font-bold text-sm sm:text-base">
                    <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <span>الرسم البياني لنمو حفظ ومراجعة الحلقة</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      إجمالي الحفظ: {formatNumberEn(totalAyahsMemorized)} آية
                    </span>
                    <span className="text-blue-800 font-semibold bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                      إجمالي المراجعة: {formatNumberEn(totalAyahsReviewed)} آية
                    </span>
                  </div>
                </div>

                <GrowthChart
                  halaqahId={halaqah.id}
                  title="مسار الإنجاز التراكمي لحلقة"
                  compact={true}
                  hideComparison={true}
                  timelineLabel="النمو البياني"
                  subtitle={null}
                />
              </div>

              {/* Students in this Class */}
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-stone-900 font-bold text-sm sm:text-base">
                    <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                      <Users className="w-5 h-5" />
                    </div>
                    <span>طلاب الحلقة المسجلون ({formatNumberEn(halaqahStudents.length)})</span>
                  </div>
                </div>

                {halaqahStudents.length === 0 ? (
                  <div className="text-center py-8 bg-stone-50 rounded-2xl border border-dashed border-stone-300 space-y-2">
                    <Users className="w-10 h-10 text-stone-400 mx-auto" />
                    <p className="text-xs text-stone-500 font-medium">
                      لا يوجد طلاب مسجلون في هذه الحلقة حالياً.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {halaqahStudents.map((st) => {
                      const stats = calculateStudentStats(st.id);
                      const logs = getLogs(st.id);
                      const lastLog = logs.length > 0 ? logs[0] : null;

                      return (
                        <div
                          key={st.id}
                          onClick={() => onSelectStudent && onSelectStudent(st)}
                          className={`p-4 rounded-2xl bg-stone-50 border border-stone-200 hover:border-emerald-500 hover:bg-emerald-50/20 transition-all space-y-3 ${onSelectStudent ? 'cursor-pointer group' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-stone-900 text-sm group-hover:text-emerald-800 transition-colors flex items-center gap-1.5">
                                <span>{st.fullName}</span>
                                {onSelectStudent && (
                                  <Eye className="w-3.5 h-3.5 text-stone-400 group-hover:text-emerald-600" />
                                )}
                              </h4>
                            </div>
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold shrink-0">
                              {formatNumberEn(stats.memorizedPercentage)}% ختم
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] text-stone-600 font-medium">
                              <span>الآيات المحفوظة: {formatNumberEn(stats.totalMemorizedAyahs)} آية</span>
                              <span>{formatNumberEn(stats.completedAjzaCount)} أجزاء مكتملة</span>
                            </div>
                            <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.max(2, stats.memorizedPercentage)}%` }}
                              />
                            </div>
                          </div>

                          {/* Last session info */}
                          {lastLog && (
                            <div className="pt-1 text-[11px] text-stone-500 flex items-center justify-between border-t border-stone-200">
                              <span>آخر تسميع: {lastLog.surahName} ({formatNumberEn(lastLog.startAyah)}-{formatNumberEn(lastLog.endAyah)})</span>
                              <span>{formatDateEn(lastLog.date)}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Recitation Sessions Log (سجل التسميع الخاص بالحلقة) */}
          {activeTab === 'logs' && (
            <div className="space-y-4">

              {/* Logs List */}
              {halaqahLogs.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-stone-200 text-center space-y-3">
                  <FileCheck className="w-10 h-10 text-stone-300 mx-auto" />
                  <h4 className="font-bold text-stone-700 text-sm">
                    لم يتم تسجيل أي جلسات تسميع
                  </h4>
                  <p className="text-xs text-stone-500">
                    عندما يقوم المعلم بتسجيل جلسات الحفظ والمراجعة لطلاب حلقة {halaqah.name}، ستظهر جميع الجلسات هنا تلقائيًا.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {halaqahLogs.map((log) => {
                    const isCombined = log.type === 'combined';
                    const isHifz = log.type === 'hifz';
                    const matchingStudent = halaqahStudents.find((s) => s.id === log.studentId);

                    return (
                      <div
                        key={log.id}
                        className="bg-white p-4 rounded-2xl border border-stone-200 hover:border-emerald-300 transition-all space-y-2 shadow-2xs"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Student Name */}
                            {matchingStudent && onSelectStudent ? (
                              <button
                                type="button"
                                onClick={() => onSelectStudent(matchingStudent)}
                                className="font-extrabold text-stone-900 text-sm hover:text-emerald-800 transition-colors flex items-center gap-1 cursor-pointer"
                                title="عرض ملف الطالب"
                              >
                                <span>{log.studentName || matchingStudent.fullName}</span>
                                <Eye className="w-3.5 h-3.5 text-stone-400" />
                              </button>
                            ) : (
                              <span className="font-extrabold text-stone-900 text-sm">
                                {log.studentName}
                              </span>
                            )}

                            {/* Badge Type */}
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

                            {/* Surah & Ayahs */}
                            {isCombined ? (
                              <span className="font-bold text-stone-800 text-xs">
                                🟢 حفظ: سورة {log.surahName} ({formatNumberEn(log.startAyah)}-{formatNumberEn(log.endAyah)}) • 🔵 مراجعة: سورة {log.murajaahSurahName || log.surahName} ({formatNumberEn(log.murajaahStartAyah || 1)}-{formatNumberEn(log.murajaahEndAyah || 1)})
                              </span>
                            ) : (
                              <span className="font-bold text-stone-800 text-xs">
                                سورة {log.surahName} (الآيات {formatNumberEn(log.startAyah)} - {formatNumberEn(log.endAyah)}) • {formatNumberEn(log.ayahsCount)} آية
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 self-end sm:self-center shrink-0">
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
                            <span className="text-xs text-stone-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-stone-300" />
                              <span>{formatDateEn(log.date)}</span>
                            </span>
                          </div>
                        </div>

                        {log.teacherNotes && (
                          <div className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-xl border border-stone-100">
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
        </div>
      </div>
    </div>
  );
};
