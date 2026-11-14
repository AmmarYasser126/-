import React from 'react';
import { JuzInfo, SessionLog, Student, JuzColorStatus } from '../types';
import { calculateSurahsProgressInJuz, getStudentMemorizedVersesSet } from '../utils/storage';
import { X, CheckCircle2, Layers, Palette } from 'lucide-react';

interface JuzDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  juz: JuzInfo | null;
  logs?: SessionLog[];
  studentId?: string;
  student?: Student | null;
  onSelectSurahForLog?: (surahNumber: number) => void;
  currentRole?: 'admin' | 'teacher' | 'student';
  juzColor?: JuzColorStatus;
  onSetJuzColor?: (color: JuzColorStatus | null) => void;
}

export const JuzDetailModal: React.FC<JuzDetailModalProps> = ({
  isOpen,
  onClose,
  juz,
  logs = [],
  studentId,
  student,
  currentRole = 'admin',
  juzColor,
  onSetJuzColor,
}) => {
  if (!isOpen || !juz) return null;

  const canEditColor = currentRole === 'teacher';
  const effectiveStudentId = studentId || student?.id || logs[0]?.studentId || '';

  // Get granular per-surah progress
  const surahsProgress = effectiveStudentId
    ? calculateSurahsProgressInJuz(effectiveStudentId, juz)
    : [];

  // Calculate overall Juz stats for this student
  let totalMemorizedAyahsInJuz = 0;
  if (effectiveStudentId) {
    const memorizedSet = getStudentMemorizedVersesSet(effectiveStudentId);
    surahsProgress.forEach((item) => {
      totalMemorizedAyahsInJuz += item.memorizedAyahsInJuz;
    });
  }

  const juzPercent = Math.min(100, Math.round((totalMemorizedAyahsInJuz / juz.totalAyahs) * 100));
  const completedSurahsInJuzCount = surahsProgress.filter((s) => s.isCompletedInJuz).length;
  const inProgressSurahsCount = surahsProgress.filter(
    (s) => !s.isCompletedInJuz && s.memorizedAyahsInJuz > 0
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in">
      <div
        id="juz-detail-modal-card"
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-amber-300 font-black text-base shadow-inner">
              {juz.juzNumber}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black">{juz.name}</h2>
                {juzColor === 'yellow' && (
                  <span className="bg-amber-400/30 text-amber-200 border border-amber-300/50 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    أصفر: تم الحفظ
                  </span>
                )}
                {juzColor === 'blue' && (
                  <span className="bg-sky-400/30 text-sky-200 border border-sky-300/50 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                    أزرق: تم المراجعة
                  </span>
                )}
                {juzColor === 'green' && (
                  <span className="bg-emerald-400/30 text-emerald-200 border border-emerald-300/50 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    أخضر: تم التثبيت
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="p-2 rounded-xl text-emerald-100 hover:bg-white/15 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Unified design for student, admin, and teacher */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Teacher Juz Color Selector */}
          {canEditColor ? (
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
                  <Palette className="w-4 h-4 text-emerald-700" />
                  <span>حالة ولون الجزء للطالب:</span>
                </div>
              </div>

              {juzPercent < 100 ? (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 font-bold flex items-center gap-2">
                  <span>⚠️ لا يمكن تلوين الجزء إلا بعد اكتمال حفظه بنسبة 100% (نسبة الإنجاز الحالية: {juzPercent}%)</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    {/* Option 1: Yellow */}
                    <button
                      type="button"
                      onClick={() => onSetJuzColor && onSetJuzColor('yellow')}
                      className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between gap-1.5 cursor-pointer ${
                        juzColor === 'yellow'
                          ? 'bg-amber-100 border-2 border-amber-400 ring-2 ring-amber-400/40 shadow-xs'
                          : 'bg-white border-stone-200 hover:border-amber-300 hover:bg-amber-50/40'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="w-3.5 h-3.5 rounded-full bg-amber-400 border border-amber-500 shrink-0" />
                        {juzColor === 'yellow' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />}
                      </div>
                      <div>
                        <div className="font-extrabold text-xs text-amber-950">أصفر</div>
                        <div className="text-[10px] text-amber-800 font-bold leading-tight">تم الحفظ</div>
                      </div>
                    </button>

                    {/* Option 2: Blue */}
                    <button
                      type="button"
                      onClick={() => onSetJuzColor && onSetJuzColor(juzColor === 'blue' ? 'yellow' : 'blue')}
                      className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between gap-1.5 cursor-pointer ${
                        juzColor === 'blue'
                          ? 'bg-sky-100 border-2 border-sky-400 ring-2 ring-sky-400/40 shadow-xs'
                          : 'bg-white border-stone-200 hover:border-sky-300 hover:bg-sky-50/40'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="w-3.5 h-3.5 rounded-full bg-sky-500 border border-sky-600 shrink-0" />
                        {juzColor === 'blue' && <CheckCircle2 className="w-3.5 h-3.5 text-sky-700" />}
                      </div>
                      <div>
                        <div className="font-extrabold text-xs text-sky-950">أزرق</div>
                        <div className="text-[10px] text-sky-800 font-bold leading-tight">تم المراجعة</div>
                      </div>
                    </button>

                    {/* Option 3: Green */}
                    <button
                      type="button"
                      onClick={() => onSetJuzColor && onSetJuzColor(juzColor === 'green' ? 'yellow' : 'green')}
                      className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between gap-1.5 cursor-pointer ${
                        juzColor === 'green'
                          ? 'bg-emerald-100 border-2 border-emerald-400 ring-2 ring-emerald-400/40 shadow-xs'
                          : 'bg-white border-stone-200 hover:border-emerald-300 hover:bg-emerald-50/40'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border border-emerald-600 shrink-0" />
                        {juzColor === 'green' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />}
                      </div>
                      <div>
                        <div className="font-extrabold text-xs text-emerald-950">أخضر</div>
                        <div className="text-[10px] text-emerald-800 font-bold leading-tight">تم التثبيت</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Student & Admin View: Read-only "دليل حالات الأجزاء (المعتمد من المعلم):" */
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-stone-700 flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-emerald-700" />
                  <span>دليل حالات الأجزاء:</span>
                </span>
                {juzPercent >= 100 ? (
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                      juzColor === 'blue'
                        ? 'bg-sky-100 text-sky-900 border-sky-300'
                        : juzColor === 'green'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : 'bg-amber-100 text-amber-900 border-amber-300'
                    }`}
                  >
                    الحالة: {juzColor === 'blue' ? 'أزرق (تم المراجعة)' : juzColor === 'green' ? 'أخضر (تم التثبيت)' : 'أصفر (تم الحفظ)'}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                    قيد الحفظ ({juzPercent}%)
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div
                  className={`flex items-center gap-2 p-2 rounded-xl border ${
                    juzPercent >= 100 && (!juzColor || juzColor === 'yellow')
                      ? 'bg-amber-100/90 border-amber-400 ring-1 ring-amber-400 shadow-2xs font-black'
                      : 'bg-white border-stone-200 text-stone-700'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-amber-400 shrink-0 border border-amber-500 shadow-2xs" />
                  <span className="font-black text-amber-950">أصفر:</span>
                  <span className="text-[11px] font-bold text-amber-900">تم الحفظ</span>
                </div>
                <div
                  className={`flex items-center gap-2 p-2 rounded-xl border ${
                    juzColor === 'blue'
                      ? 'bg-sky-100/90 border-sky-400 ring-1 ring-sky-400 shadow-2xs font-black'
                      : 'bg-white border-stone-200 text-stone-700'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-sky-500 shrink-0 border border-sky-600 shadow-2xs" />
                  <span className="font-black text-sky-950">أزرق:</span>
                  <span className="text-[11px] font-bold text-sky-900">تم المراجعة</span>
                </div>
                <div
                  className={`flex items-center gap-2 p-2 rounded-xl border ${
                    juzColor === 'green'
                      ? 'bg-emerald-100/90 border-emerald-400 ring-1 ring-emerald-400 shadow-2xs font-black'
                      : 'bg-white border-stone-200 text-stone-700'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shrink-0 border border-emerald-600 shadow-2xs" />
                  <span className="font-black text-emerald-950">أخضر:</span>
                  <span className="text-[11px] font-bold text-emerald-900">تم التثبيت</span>
                </div>
              </div>
            </div>
          )}

          {/* Juz Overall Progress Summary Card */}
          <div className="bg-gradient-to-b from-stone-50 to-white p-4 rounded-2xl border border-stone-200 space-y-3 shadow-xs">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-700" />
                <span className="text-stone-700 font-bold">نسبة إنجاز الجزء:</span>
                <span className="font-black text-emerald-800 text-sm">
                  {totalMemorizedAyahsInJuz} من {juz.totalAyahs} آية
                </span>
              </div>
              <span
                className={`font-black text-xs px-2.5 py-1 rounded-lg ${
                  juzPercent >= 100
                    ? 'bg-emerald-100 text-emerald-800'
                    : juzPercent > 0
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-stone-100 text-stone-600'
                }`}
              >
                {juzPercent}% منجز
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full h-2.5 bg-stone-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  juzPercent >= 100
                    ? 'bg-emerald-600'
                    : juzPercent > 0
                    ? 'bg-gradient-to-r from-amber-500 to-emerald-600'
                    : 'bg-stone-300'
                }`}
                style={{ width: `${juzPercent}%` }}
              />
            </div>

            {/* Micro stats pills */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="bg-white p-2 rounded-xl border border-stone-200/80">
                <span className="block text-xs font-black text-stone-800">
                  {surahsProgress.length}
                </span>
                <span className="text-[10px] text-stone-500 font-bold">إجمالي السور</span>
              </div>
              <div className="bg-emerald-50/70 p-2 rounded-xl border border-emerald-200/60">
                <span className="block text-xs font-black text-emerald-800">
                  {completedSurahsInJuzCount}
                </span>
                <span className="text-[10px] text-emerald-700 font-bold">سور مكتملة</span>
              </div>
              <div className="bg-amber-50/70 p-2 rounded-xl border border-amber-200/60">
                <span className="block text-xs font-black text-amber-800">
                  {inProgressSurahsCount}
                </span>
                <span className="text-[10px] text-amber-700 font-bold">قيد الحفظ</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
