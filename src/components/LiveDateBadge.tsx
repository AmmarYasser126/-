import React, { useState, useEffect } from 'react';
import {
  getDayNameAr,
  formatDateEn,
  formatHijriDate,
  formatTimeEn,
  isClassDay,
} from '../utils/format';
import { Calendar, Clock, Sparkles } from 'lucide-react';

interface LiveDateBadgeProps {
  className?: string;
  showTime?: boolean;
  showClassStatus?: boolean;
}

export const LiveDateBadge: React.FC<LiveDateBadgeProps> = ({
  className = '',
  showTime = false,
  showClassStatus = true,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  useEffect(() => {
    // Update constantly every second
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const dayName = getDayNameAr(currentDate);
  const gregDate = formatDateEn(currentDate);
  const hijriDate = formatHijriDate(currentDate);
  const timeStr = formatTimeEn(currentDate, true);
  const isClass = isClassDay(currentDate);

  return (
    <div
      className={`flex items-center justify-between gap-1.5 text-[10px] sm:text-xs font-semibold select-none w-full max-w-full ${className}`}
      dir="rtl"
    >
      {/* Day & Date Combo */}
      <div className="flex items-center gap-1 sm:gap-1.5 bg-stone-800/90 text-stone-200 px-2 sm:px-2.5 py-1 rounded-xl border border-stone-700/80 shadow-2xs min-w-0 shrink">
        <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span className="font-bold text-emerald-300 shrink-0">{dayName}</span>
        <span className="text-stone-500 shrink-0">•</span>
        <span className="tabular-nums text-stone-200 shrink-0 text-[10px] sm:text-xs">{gregDate} م</span>
        {hijriDate !== '—' && (
          <>
            <span className="text-stone-500 shrink-0">•</span>
            <span className="text-amber-300 font-bold truncate text-[10px] sm:text-xs">{hijriDate}</span>
          </>
        )}
      </div>

      {/* Class Day Indicator (Sunday to Wednesday only) */}
      {showClassStatus && (
        <div className="shrink-0">
          <span
            className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg sm:rounded-xl text-[9.5px] sm:text-[10px] font-bold border whitespace-nowrap ${
              isClass
                ? 'bg-emerald-950 text-emerald-300 border-emerald-700/80'
                : 'bg-stone-900/90 text-stone-300 border-stone-700'
            }`}
            title={isClass ? 'تقام الحلقات من الأحد إلى الأربعاء' : 'إجازة، تقام الحلقات من الأحد إلى الأربعاء'}
          >
            {isClass ? 'يوم حلقة دراسية' : 'إجازة أسبوعية'}
          </span>
        </div>
      )}

      {/* Live Clock */}
      {showTime && (
        <div className="flex items-center gap-1 bg-stone-800/80 text-stone-300 px-2 py-1 rounded-xl border border-stone-700/80 tabular-nums text-[10px] sm:text-[11px] whitespace-nowrap shrink-0">
          <Clock className="w-3 h-3 text-stone-400 shrink-0" />
          <span>{timeStr}</span>
        </div>
      )}
    </div>
  );
};
