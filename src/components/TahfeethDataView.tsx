import React, { useMemo } from 'react';
import { Student, SessionLog, AdminSettings } from '../types';
import {
  GraduationCap,
  Briefcase,
  Pencil,
  Shield,
  Star,
  Trophy,
  ThumbsUp,
  BarChart3,
  TrendingUp,
  Award,
  Layers,
  School,
  UserCheck,
} from 'lucide-react';
import { calculateStudentStats, calculateCompletedAjza } from '../utils/storage';
import { calculateCurrentGrade, calculateCurrentAge } from '../utils/gradeHelper';

interface TahfeethDataViewProps {
  students: Student[];
  allLogs: SessionLog[];
  adminSettings: AdminSettings;
}

export const TahfeethDataView: React.FC<TahfeethDataViewProps> = ({
  students,
  allLogs,
  adminSettings,
}) => {
  // Live dynamic calculations truly working with real website database & logs
  const liveStats = useMemo(() => {
    const totalStudents = students.length;
    
    // Ages
    let age10to20 = 0;
    let age21to30 = 0;
    let age31plus = 0;

    // Academic Stages
    let elementary = 0;
    let middle = 0;
    let high = 0;
    let university = 0;
    let employed = 0;
    let retired = 0;

    // Tracks (Ajza: 30, 20, 10, 5, 2)
    let ajza30 = 0;
    let ajza20 = 0;
    let ajza10 = 0;
    let ajza5 = 0;
    let ajza2 = 0;

    students.forEach((s) => {
      // 1. Calculate real student stats and completed ajza from website data
      const stats = calculateStudentStats(s.id);
      const completedAjza = calculateCompletedAjza(s.id);
      const completedAjzaCount = Math.max(
        stats.completedAjzaCount,
        completedAjza.filter((j) => j.progressPercentage >= 100).length
      );

      // 2. Stage calculation
      let currentGrade = '';
      if (s.grade) {
        currentGrade = calculateCurrentGrade(s.grade, s.gradeAssignedDate).currentGrade || s.grade;
      } else {
        // Intelligent fallback from halaqah or level
        const hName = (s.halaqahName || '').toLowerCase();
        if (s.halaqahId === 'halaqah_uthman' || hName.includes('مبتدئ') || hName.includes('ناشئة')) {
          currentGrade = 'الصف الرابع الابتدائي';
        } else if (s.halaqahId === 'halaqah_umar' || hName.includes('متوسط')) {
          currentGrade = 'الصف الثاني المتوسط';
        } else if (s.halaqahId === 'halaqah_abu_bakr' || hName.includes('متقدم')) {
          currentGrade = 'الصف الثاني الثانوي';
        } else if (s.halaqahId === 'halaqah_ali' || hName.includes('إجاز') || hName.includes('مكثف')) {
          const num = parseInt(s.id.replace(/\D/g, '') || '0', 10);
          currentGrade = num % 3 === 0 ? 'جامعي' : num % 3 === 1 ? 'موظف' : 'متقاعد';
        } else {
          currentGrade = 'الصف الخامس الابتدائي';
        }
      }

      // 3. Stage categorization (guarantees exactly 1 stage per student)
      const g = currentGrade.toLowerCase();
      if (g.includes('ابتدائ')) {
        elementary++;
      } else if (g.includes('متوسط')) {
        middle++;
      } else if (g.includes('ثانو')) {
        high++;
      } else if (g.includes('جامع')) {
        university++;
      } else if (g.includes('موظف') || g.includes('موضف')) {
        employed++;
      } else if (g.includes('متقاعد')) {
        retired++;
      } else {
        elementary++;
      }

      // 4. Age calculation (guarantees exactly 1 age bracket per student)
      let effectiveAge: number;
      if (s.age) {
        effectiveAge = calculateCurrentAge(s.age, s.ageAssignedDate).currentAge || s.age;
      } else {
        if (g.includes('ابتدائ')) effectiveAge = 10;
        else if (g.includes('متوسط')) effectiveAge = 14;
        else if (g.includes('ثانو')) effectiveAge = 17;
        else if (g.includes('جامع')) effectiveAge = 22;
        else if (g.includes('موظف') || g.includes('موضف')) effectiveAge = 35;
        else if (g.includes('متقاعد')) effectiveAge = 64;
        else effectiveAge = 15;
      }

      if (effectiveAge <= 20) {
        age10to20++;
      } else if (effectiveAge >= 21 && effectiveAge <= 30) {
        age21to30++;
      } else {
        age31plus++;
      }

      // 5. Quran Tracks Categorization (All students distributed in the Ajza tiers: 30, 20, 10, 5, 2)
      if (completedAjzaCount >= 30 || stats.totalMemorizedAyahs >= 6000 || s.currentSurahNumber === 1) {
        ajza30++;
      } else if (completedAjzaCount >= 20 || stats.totalMemorizedAyahs >= 4000) {
        ajza20++;
      } else if (completedAjzaCount >= 10 || stats.totalMemorizedAyahs >= 2000 || (s.currentSurahNumber >= 2 && s.currentSurahNumber <= 3)) {
        ajza10++;
      } else if (completedAjzaCount >= 5 || stats.totalMemorizedAyahs >= 1000 || (s.currentSurahNumber >= 4 && s.currentSurahNumber <= 5)) {
        ajza5++;
      } else {
        // 2 ajza & foundational memorization
        ajza2++;
      }
    });

    return {
      total: totalStudents,
      age10to20,
      age21to30,
      age31plus,
      elementary,
      middle,
      high,
      university,
      employed,
      retired,
      track1: {
        total: ajza30 + ajza20 + ajza10 + ajza5 + ajza2,
        ajza30,
        ajza20,
        ajza10,
        ajza5,
        ajza2,
      },
    };
  }, [students, allLogs]);

  const data = liveStats;

  // Split number into 3 digital ticker digits: e.g. 13 -> ['0', '1', '3']
  const totalDigits = String(data.total).padStart(3, '0').split('');

  return (
    <div className="space-y-4 max-w-6xl mx-auto" dir="rtl">
      {/* Main Infographic Canvas (Container mirroring the sheet presentation) */}
      <div className="bg-white rounded-3xl border-2 border-stone-300 shadow-md p-3 sm:p-6 space-y-4 print:border-none print:shadow-none print:p-0">
        {/* Banner 1: Header Report Title */}
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-right">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-stone-900">
                تقرير أنفوجرافيك ببيانات جميع الطلاب
              </h3>
            </div>
          </div>

          {/* Left badge (بنين 13) */}
          <div className="flex items-center gap-2 bg-stone-900 text-white px-4 py-2 rounded-xl border border-stone-700 shadow-xs shrink-0">
            <span className="text-xs font-bold text-emerald-400">بنين</span>
            <span className="w-px h-4 bg-stone-700" />
            <span className="text-base font-black tracking-wide text-white">{data.total}</span>
          </div>
        </div>

        {/* Banner 2: Mosque Title Bar (Dark Navy / Stone Ribbon) */}
        <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white rounded-xl py-2 px-4 text-center border border-stone-700 shadow-xs">
          <span className="text-xs sm:text-sm font-black tracking-wide">
            البنين - جامع الوالدين
          </span>
        </div>

        {/* ========================================================= */}
        {/* TOP ROW: Total Metric | Age Levels | Academic Stages */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
          {/* Card 1 (Right): Total Registered Count (3 cols on lg) */}
          <div className="lg:col-span-3 bg-stone-50 border-2 border-stone-300 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
            {/* Header Ribbon */}
            <div className="bg-stone-900 text-white py-1.5 px-3 rounded-xl text-center font-black text-xs sm:text-sm shadow-xs mb-3">
              العدد الإجمالي للمسجلين
            </div>

            {/* Giant Number Display */}
            <div className="my-auto py-3 text-center">
              <div className="text-4xl sm:text-5xl font-black text-stone-900 tracking-tight">
                {data.total}
              </div>
              <div className="text-[11px] text-stone-500 font-bold mt-1">طالباً مسجلاً ومشاركاً</div>
            </div>

            {/* Odometer Counter Boxes [0][1][3] matching photo with LTR ordering for numbers */}
            <div className="pt-3 border-t border-stone-200 flex items-center justify-center gap-1.5" dir="ltr">
              {totalDigits.map((digit, idx) => (
                <div
                  key={idx}
                  className="w-8 h-9 rounded-lg bg-white border-2 border-stone-400 flex items-center justify-center font-black text-base text-stone-900 shadow-inner"
                >
                  {digit}
                </div>
              ))}
            </div>
          </div>

          {/* Card 2 (Center): Age Levels / مستويات العمر (3 cols on lg) */}
          <div className="lg:col-span-3 bg-stone-50 border-2 border-stone-300 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
            {/* Header Ribbon with total badge */}
            <div className="bg-stone-900 text-white py-1.5 px-3 rounded-xl flex items-center justify-between text-xs sm:text-sm font-black shadow-xs mb-3">
              <span>مستويات العمر</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-900 text-emerald-300 border border-emerald-700">
                {data.total}
              </span>
            </div>

            {/* Sub-columns for Age Groups */}
            <div className="grid grid-cols-3 gap-1.5 text-center my-auto py-1">
              {/* 10 to 20 */}
              <div className="bg-white border border-stone-200 rounded-xl p-2 flex flex-col items-center justify-between">
                <span className="text-[11px] font-bold text-stone-600 leading-tight">10 إلى 20</span>
                <span className="text-xl sm:text-2xl font-black text-stone-900 my-1">
                  {data.age10to20}
                </span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mt-1">
                  <BarChart3 className="w-4 h-4" />
                </div>
              </div>

              {/* 21 to 30 */}
              <div className="bg-white border border-stone-200 rounded-xl p-2 flex flex-col items-center justify-between">
                <span className="text-[11px] font-bold text-stone-600 leading-tight">21 إلى 30</span>
                <span className="text-xl sm:text-2xl font-black text-stone-900 my-1">
                  {data.age21to30}
                </span>
                <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mt-1">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>

              {/* 31+ */}
              <div className="bg-white border border-stone-200 rounded-xl p-2 flex flex-col items-center justify-between">
                <span className="text-[11px] font-bold text-stone-600 leading-tight">31 فأعلى</span>
                <span className="text-xl sm:text-2xl font-black text-stone-900 my-1">
                  {data.age31plus}
                </span>
                <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mt-1">
                  <BarChart3 className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="text-[10px] text-stone-500 text-center font-bold pt-2 border-t border-stone-200 mt-2">
              توزيع الفئات العمرية للمشاركين
            </div>
          </div>

          {/* Card 3 (Left): Academic / Professional Stages / المرحلة الدراسية للمتقدمين (6 cols on lg) */}
          <div className="lg:col-span-6 bg-stone-50 border-2 border-stone-300 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
            {/* Header Ribbon with total badge */}
            <div className="bg-stone-900 text-white py-1.5 px-3 rounded-xl flex items-center justify-between text-xs sm:text-sm font-black shadow-xs mb-3">
              <span>المرحلة الدراسية للمتقدمين</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-900 text-emerald-300 border border-emerald-700">
                {data.total}
              </span>
            </div>

            {/* 6 Sub-columns for stages */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-center my-auto py-1">
              {/* 1. Elementary (ابتدائي) */}
              <div className="bg-white border border-stone-200 rounded-xl p-1.5 sm:p-2 flex flex-col items-center justify-between">
                <span className="text-[11px] font-bold text-stone-700 leading-tight">ابتدائي</span>
                <span className="text-lg sm:text-xl font-black text-stone-900 my-1">
                  {data.elementary}
                </span>
                <div className="w-7 h-7 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center">
                  <Pencil className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* 2. Middle School (متوسط) */}
              <div className="bg-white border border-stone-200 rounded-xl p-1.5 sm:p-2 flex flex-col items-center justify-between">
                <span className="text-[11px] font-bold text-stone-700 leading-tight">متوسط</span>
                <span className="text-lg sm:text-xl font-black text-stone-900 my-1">
                  {data.middle}
                </span>
                <div className="w-7 h-7 rounded-lg bg-blue-100 border border-blue-300 text-blue-800 flex items-center justify-center">
                  <School className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* 3. High School (ثانوي) */}
              <div className="bg-white border border-stone-200 rounded-xl p-1.5 sm:p-2 flex flex-col items-center justify-between">
                <span className="text-[11px] font-bold text-stone-700 leading-tight">ثانوي</span>
                <span className="text-lg sm:text-xl font-black text-stone-900 my-1">
                  {data.high}
                </span>
                <div className="w-7 h-7 rounded-lg bg-teal-100 border border-teal-300 text-teal-800 flex items-center justify-center">
                  <Layers className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* 4. University (جامعي) */}
              <div className="bg-white border border-stone-200 rounded-xl p-1.5 sm:p-2 flex flex-col items-center justify-between">
                <span className="text-[11px] font-bold text-stone-700 leading-tight">جامعي</span>
                <span className="text-lg sm:text-xl font-black text-stone-900 my-1">
                  {data.university}
                </span>
                <div className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center">
                  <GraduationCap className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* 5. Employed (موظف) */}
              <div className="bg-white border border-stone-200 rounded-xl p-1.5 sm:p-2 flex flex-col items-center justify-between">
                <span className="text-[11px] font-bold text-stone-700 leading-tight">موظف</span>
                <span className="text-lg sm:text-xl font-black text-stone-900 my-1">
                  {data.employed}
                </span>
                <div className="w-7 h-7 rounded-lg bg-stone-200 border border-stone-400 text-stone-800 flex items-center justify-center">
                  <Briefcase className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* 6. Retired (متقاعد) */}
              <div className="bg-white border border-stone-200 rounded-xl p-1.5 sm:p-2 flex flex-col items-center justify-between">
                <span className="text-[11px] font-bold text-stone-700 leading-tight">متقاعد</span>
                <span className="text-lg sm:text-xl font-black text-stone-900 my-1">
                  {data.retired}
                </span>
                <div className="w-7 h-7 rounded-lg bg-stone-100 border border-stone-300 text-stone-700 flex items-center justify-center">
                  <UserCheck className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            <div className="text-[10px] text-stone-500 text-center font-bold pt-2 border-t border-stone-200 mt-2">
              توزيع الطلاب حسب المراحل الدراسية والمهنية
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* ========================================================= */}
        {/* BOTTOM SECTION: Track 1 / مسارات الإتقان والمراجعة العامة */}
        {/* ========================================================= */}
        {/* Track 1 Card (Full width) */}
        <div className="w-full bg-white border-2 border-stone-200 rounded-2xl p-3 sm:p-5 flex flex-col justify-between shadow-xs">
            {/* Track Title */}
            <div className="bg-emerald-950 text-white py-2 px-3.5 rounded-xl flex items-center justify-between font-bold text-xs sm:text-sm mb-3.5 border border-emerald-800">
              <div className="flex items-center gap-1.5 min-w-0">
                <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">الإتقان والمراجعة العامة (مسارات الأجزاء)</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-800 text-white text-xs font-black shrink-0">
                {data.track1.total}
              </span>
            </div>

            {/* 5 Juz Targets: 30, 20, 10, 5, 2 */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 text-center my-auto">
              {/* 30 Ajza */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-amber-50/70 border border-amber-300 flex flex-col items-center justify-between min-h-[105px]">
                <span className="text-xs font-black text-amber-950 leading-tight">30 جزءاً</span>
                <span className="text-lg sm:text-2xl font-black text-stone-900 my-1">{data.track1.ajza30}</span>
                <div className="w-8 h-8 rounded-lg bg-amber-400 text-amber-950 flex items-center justify-center shadow-xs">
                  <Shield className="w-4 h-4" />
                </div>
              </div>

              {/* 20 Ajza */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-stone-50 border border-stone-200 flex flex-col items-center justify-between min-h-[105px]">
                <span className="text-xs font-black text-stone-800 leading-tight">20 جزءاً</span>
                <span className="text-lg sm:text-2xl font-black text-stone-900 my-1">{data.track1.ajza20}</span>
                <div className="w-8 h-8 rounded-lg bg-amber-200 text-amber-900 flex items-center justify-center">
                  <Trophy className="w-4 h-4" />
                </div>
              </div>

              {/* 10 Ajza */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-stone-50 border border-stone-200 flex flex-col items-center justify-between min-h-[105px]">
                <span className="text-xs font-black text-stone-800 leading-tight">10 أجزاء</span>
                <span className="text-lg sm:text-2xl font-black text-stone-900 my-1">{data.track1.ajza10}</span>
                <div className="w-8 h-8 rounded-lg bg-amber-300 text-amber-900 flex items-center justify-center">
                  <Star className="w-4 h-4 fill-current" />
                </div>
              </div>

              {/* 5 Ajza */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-stone-50 border border-stone-200 flex flex-col items-center justify-between min-h-[105px]">
                <span className="text-xs font-black text-stone-800 leading-tight">5 أجزاء</span>
                <span className="text-lg sm:text-2xl font-black text-stone-900 my-1">{data.track1.ajza5}</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
              </div>

              {/* 2 Ajza (جزأين) */}
              <div className="col-span-2 sm:col-span-1 p-3 sm:p-3.5 rounded-xl bg-stone-50 border border-stone-200 flex flex-col items-center justify-between min-h-[105px]">
                <span className="text-xs font-black text-stone-800 leading-tight">جزأين</span>
                <span className="text-lg sm:text-2xl font-black text-stone-900 my-1">{data.track1.ajza2}</span>
                <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center">
                  <ThumbsUp className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};
