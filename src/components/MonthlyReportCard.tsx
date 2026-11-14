import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, SessionLog, AttendanceRecord, TeacherProfile } from '../types';
import {
  getLogs,
  getAttendance,
  getStudentTeacher,
  getHalaqat,
} from '../utils/storage';
import { getSurahByNumber } from '../data/quranData';
import {
  formatDateEn,
  formatNumberEn,
  formatHijriDate,
  formatHijriMonthYear,
} from '../utils/format';
import {
  BookOpen,
  RotateCcw,
  Calendar,
  Award,
  CalendarX,
  Layers,
  ChevronDown,
} from 'lucide-react';

interface MonthlyReportCardProps {
  student: Student;
  currentRole?: 'student' | 'admin';
  onClose?: () => void;
  isModal?: boolean;
}

export const MonthlyReportCard: React.FC<MonthlyReportCardProps> = ({
  student,
}) => {
  const reportRef = useRef<HTMLDivElement | null>(null);

  // Live state with event listener so changes in logs or attendance update immediately
  const [allLogs, setAllLogs] = useState<SessionLog[]>(() =>
    getLogs(student.id).filter((l) => !l.hiddenForStudent)
  );

  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>(() =>
    getAttendance(undefined, undefined, student.id)
  );

  useEffect(() => {
    const handleUpdate = () => {
      setAllLogs(getLogs(student.id).filter((l) => !l.hiddenForStudent));
      setAllAttendance(getAttendance(undefined, undefined, student.id));
    };

    handleUpdate();
    window.addEventListener('tahfeeth_data_updated', handleUpdate);
    return () => window.removeEventListener('tahfeeth_data_updated', handleUpdate);
  }, [student.id]);

  const teacher: TeacherProfile | null = useMemo(() => {
    return getStudentTeacher(student.id);
  }, [student.id]);

  const halaqat = useMemo(() => getHalaqat(), []);
  const halaqahName =
    student.halaqahName ||
    halaqat.find((h) => h.id === student.halaqahId)?.name ||
    'الحلقة العامة';

  // Discover all months available in data
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();

    allLogs.forEach((log) => {
      const d = log.date || log.createdAt;
      if (d && d.length >= 7) {
        monthSet.add(d.slice(0, 7));
      }
    });

    allAttendance.forEach((att) => {
      if (att.date && att.date.length >= 7) {
        monthSet.add(att.date.slice(0, 7));
      }
    });

    // Also include current month
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthSet.add(currentMonthKey);

    return Array.from(monthSet).sort((a, b) => b.localeCompare(a));
  }, [allLogs, allAttendance]);

  // Find the smartest default period: prefer month with actual logs, or current month
  const defaultPeriod = useMemo(() => {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const hasCurrentMonthData = allLogs.some((l) => (l.date || l.createdAt || '').startsWith(currentMonthKey));

    if (hasCurrentMonthData) {
      return currentMonthKey;
    }

    for (const ym of availableMonths) {
      if (allLogs.some((l) => (l.date || l.createdAt || '').startsWith(ym))) {
        return ym;
      }
    }

    return availableMonths[0] || currentMonthKey;
  }, [allLogs, availableMonths]);

  // Selected period: 'YYYY-MM'
  const [selectedPeriod, setSelectedPeriod] = useState<string>(defaultPeriod);

  // Sync selected period if default changes
  useEffect(() => {
    setSelectedPeriod(defaultPeriod);
  }, [defaultPeriod]);

  // Month labels generator
  const getMonthInfo = (yearMonth: string) => {
    try {
      const [yearStr, monthStr] = yearMonth.split('-');
      const y = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10);
      const d = new Date(y, m - 1, 15);

      const arabicMonths = [
        'يناير',
        'فبراير',
        'مارس',
        'أبريل',
        'مايو',
        'يونيو',
        'يوليو',
        'أغسطس',
        'سبتمبر',
        'أكتوبر',
        'نوفمبر',
        'ديسمبر',
      ];
      const monthName = arabicMonths[m - 1] || monthStr;
      const gregLabel = `${monthName} ${y} م`;
      const hijriLabel = formatHijriMonthYear(d) || formatHijriDate(d);

      return {
        gregorian: gregLabel,
        hijri: hijriLabel,
        full: hijriLabel ? `${hijriLabel} (${gregLabel})` : gregLabel,
      };
    } catch {
      return { gregorian: yearMonth, hijri: '', full: yearMonth };
    }
  };

  const currentPeriodInfo = getMonthInfo(selectedPeriod);

  // Filter logs for selected period
  const filteredLogs = useMemo(() => {
    return allLogs.filter((log) => {
      const d = log.date || log.createdAt;
      return d && d.startsWith(selectedPeriod);
    });
  }, [allLogs, selectedPeriod]);

  // Filter attendance for selected period
  const filteredAttendance = useMemo(() => {
    return allAttendance.filter((att) => att.date && att.date.startsWith(selectedPeriod));
  }, [allAttendance, selectedPeriod]);

  // 1. الآيات المحفوظة
  const totalHifzAyahs = useMemo(() => {
    return filteredLogs
      .filter((l) => l.type === 'hifz' || l.type === 'combined')
      .reduce((sum, l) => sum + (l.ayahsCount || 0), 0);
  }, [filteredLogs]);

  // 2. الآيات المراجعة
  const totalMurajaahAyahs = useMemo(() => {
    return filteredLogs.reduce((sum, l) => {
      if (l.type === 'murajaah') {
        return sum + (l.ayahsCount || 0);
      }
      if (l.type === 'combined') {
        return sum + (l.murajaahAyahsCount || 0);
      }
      return sum;
    }, 0);
  }, [filteredLogs]);

  // 3. أيام الغياب
  const totalAbsentDays = useMemo(() => {
    return filteredAttendance.filter((a) => a.status === 'absent').length;
  }, [filteredAttendance]);

  // 4. مجموع النقاط
  const totalPoints = useMemo(() => {
    return filteredLogs.reduce((sum, l) => {
      if (typeof l.totalStars === 'number') {
        return sum + l.totalStars;
      }
      if (l.evaluationPoints) {
        const p = l.evaluationPoints;
        return (
          sum +
          (p.totalPoints ??
            ((p.attendance || 0) +
              (p.hifz || 0) +
              (p.murajaah || 0) +
              (p.discipline || 0) +
              (p.attire || 0)))
        );
      }
      return sum;
    }, 0);
  }, [filteredLogs]);

  // 5. السور المحفوظة (Surahs Memorized)
  const memorizedSurahsList = useMemo(() => {
    const surahSet = new Set<string>();
    filteredLogs
      .filter((l) => l.type === 'hifz' || l.type === 'combined')
      .forEach((l) => {
        if (l.isSurahRange && l.surahsIncluded && l.surahsIncluded.length > 0) {
          l.surahsIncluded.forEach((sNum) => {
            const sObj = getSurahByNumber(sNum);
            if (sObj) {
              surahSet.add(`سورة ${sObj.name}`);
            }
          });
        } else if (l.isSurahRange && l.fromSurahNumber && l.toSurahNumber) {
          const min = Math.min(l.fromSurahNumber, l.toSurahNumber);
          const max = Math.max(l.fromSurahNumber, l.toSurahNumber);
          for (let sNum = min; sNum <= max; sNum++) {
            const sObj = getSurahByNumber(sNum);
            if (sObj) {
              surahSet.add(`سورة ${sObj.name}`);
            }
          }
        } else if (l.surahName && !l.surahName.includes('لا يوجد')) {
          const clean = l.surahName.replace(/^سورة\s+/, '').trim();
          if (clean) {
            surahSet.add(`سورة ${clean}`);
          }
        }
      });
    return Array.from(surahSet);
  }, [filteredLogs]);

  // Formatted export date (Hijri and Gregorian)
  const formattedExportDate = useMemo(() => {
    const now = new Date();
    const greg = `${formatDateEn(now)} م`;
    const hijri = formatHijriDate(now);
    return `${hijri} - ${greg}`;
  }, []);

  // Formatted period title
  const formattedPeriodTitle = useMemo(() => {
    return currentPeriodInfo.hijri
      ? `شهر: ${currentPeriodInfo.hijri} (${currentPeriodInfo.gregorian})`
      : `شهر: ${currentPeriodInfo.gregorian}`;
  }, [currentPeriodInfo]);

  return (
    <div className="space-y-4 max-w-4xl mx-auto" dir="rtl">
      {/* Top Action & Filter Bar (Non-Printable) */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between gap-3 print:hidden">
        {/* Period Selector (Months Only) */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-800 shrink-0" />
          <span className="text-xs font-bold text-stone-700">فترة التقرير:</span>
          <div className="relative">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="appearance-none bg-stone-50 border border-stone-300 hover:border-emerald-700 text-xs font-bold text-stone-900 rounded-xl px-3 py-2 pr-3 pl-8 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 transition-all cursor-pointer shadow-2xs"
            >
              {availableMonths.map((ym) => {
                const info = getMonthInfo(ym);
                return (
                  <option key={ym} value={ym}>
                    {info.full}
                  </option>
                );
              })}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-stone-500 absolute left-2.5 top-3 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ==============================================================
          OFFICIAL PROFESSIONAL MONTHLY REPORT IMAGE CONTAINER
          ============================================================== */}
      <div
        ref={reportRef}
        id="printable-monthly-report"
        className="bg-white rounded-2xl p-6 sm:p-10 shadow-lg border-2 border-stone-200 space-y-6 text-stone-900"
      >
        {/* Header: Official Academy Branding & Report Title */}
        <div className="border-b-2 border-stone-100 pb-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-900 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-black text-stone-950 leading-tight">
                  جامع الوالدين
                </h1>
                <p className="text-xs font-semibold text-stone-500">
                  حلقات القرآن الكريم والمراجعة والتثبيت
                </p>
              </div>
            </div>

            <div className="sm:text-left">
              <div className="inline-block px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold text-xs">
                التقرير الشهري لإنجاز الطالب
              </div>
              <div className="text-xs font-bold text-stone-600 mt-1">
                {formattedPeriodTitle}
              </div>
            </div>
          </div>
        </div>

        {/* Student Identification Information Bar */}
        <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold text-stone-500 block">اسم الطالب</span>
            <div className="text-xl font-black text-stone-950">
              {student.fullName}
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs font-semibold text-stone-700">
            <div>
              <span className="text-[11px] font-normal text-stone-500 block">الحلقة</span>
              <span className="font-bold text-stone-900">{halaqahName}</span>
            </div>

            <div>
              <span className="text-[11px] font-normal text-stone-500 block">المعلم</span>
              <span className="font-bold text-stone-900">{teacher?.name || 'معلم الحلقة'}</span>
            </div>
          </div>
        </div>

        {/* The 4 Core Metrics Grid (Strictly: الآيات المحفوظة، الآيات المراجعة، أيام الغياب، مجموع النقاط) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Metric 1: الآيات المحفوظة */}
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 space-y-2">
            <div className="flex items-center justify-between text-emerald-800">
              <span className="text-xs font-bold text-stone-700">الآيات المحفوظة</span>
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-stone-950">
              {formatNumberEn(totalHifzAyahs)}
            </div>
            <div className="text-[11px] font-medium text-stone-500">
              آية حفظ جديد
            </div>
          </div>

          {/* Metric 2: الآيات المراجعة */}
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 space-y-2">
            <div className="flex items-center justify-between text-teal-800">
              <span className="text-xs font-bold text-stone-700">الآيات المراجعة</span>
              <RotateCcw className="w-4 h-4" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-stone-950">
              {formatNumberEn(totalMurajaahAyahs)}
            </div>
            <div className="text-[11px] font-medium text-stone-500">
              آية مراجعة وتثبيت
            </div>
          </div>

          {/* Metric 3: أيام الغياب */}
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 space-y-2">
            <div className="flex items-center justify-between text-rose-800">
              <span className="text-xs font-bold text-stone-700">أيام الغياب</span>
              <CalendarX className="w-4 h-4" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-stone-950">
              {formatNumberEn(totalAbsentDays)}
            </div>
            <div className="text-[11px] font-medium text-stone-500">
              {totalAbsentDays === 0 ? 'انضباط كامل دون غياب' : 'يوم غياب'}
            </div>
          </div>

          {/* Metric 4: مجموع النقاط */}
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 space-y-2">
            <div className="flex items-center justify-between text-amber-700">
              <span className="text-xs font-bold text-stone-700">مجموع النقاط</span>
              <Award className="w-4 h-4" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-stone-950">
              {formatNumberEn(totalPoints)}
            </div>
            <div className="text-[11px] font-medium text-stone-500">
              نقطة تميز وتسميع
            </div>
          </div>
        </div>

        {/* 5. السور المحفوظة (Surahs Memorized) */}
        <div className="bg-stone-50 rounded-xl p-5 border border-stone-200 space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-800" />
            <h2 className="text-xs font-bold text-stone-900">
              السور المحفوظة ({formatNumberEn(memorizedSurahsList.length)})
            </h2>
          </div>

          {memorizedSurahsList.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {memorizedSurahsList.map((surahName, index) => (
                <span
                  key={`${surahName}-${index}`}
                  className="px-3 py-1.5 rounded-lg bg-white border border-stone-300 text-xs font-bold text-stone-900 shadow-xs"
                >
                  {surahName}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-xs font-medium text-stone-500 py-1">
              لم تسجل سور محفوظة خلال هذه الفترة.
            </div>
          )}
        </div>

        {/* Official Footer Verification */}
        <div className="pt-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500 font-medium">
          <div>
            جامع الوالدين — نظام التحفيظ والمراجعة المعتمد
          </div>
          <div>
            تاريخ التصدير: {formattedExportDate}
          </div>
        </div>
      </div>
    </div>
  );
};
