import React, { useState } from 'react';
import { Star, Sparkles, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { EvaluationPoints, TeacherGrade } from '../types';

export function getEffectiveStars(log?: {
  totalStars?: number;
  evaluationPoints?: EvaluationPoints;
  teacherGrade?: TeacherGrade;
}): number {
  if (!log) return 6;
  if (typeof log.totalStars === 'number') {
    return Math.max(0, Math.min(6, Math.round(log.totalStars)));
  }
  if (log.evaluationPoints && typeof log.evaluationPoints.totalPoints === 'number') {
    return Math.max(0, Math.min(6, Math.round(log.evaluationPoints.totalPoints)));
  }
  switch (log.teacherGrade) {
    case 'ممتاز':
      return 6;
    case 'جيد جدًا':
      return 5;
    case 'جيد':
      return 4;
    case 'يحتاج إعادة':
      return 2;
    default:
      return 6;
  }
}

interface SessionStarsBadgeProps {
  points?: EvaluationPoints;
  totalStars?: number;
  teacherGrade?: TeacherGrade;
  size?: 'xs' | 'sm' | 'md';
  showDetailsToggle?: boolean;
  className?: string;
}

export const SessionStarsBadge: React.FC<SessionStarsBadgeProps> = ({
  points,
  totalStars,
  teacherGrade,
  size = 'sm',
  showDetailsToggle = false,
  className = '',
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const starsCount = getEffectiveStars({ totalStars, evaluationPoints: points, teacherGrade });

  const starIconSize = size === 'xs' ? 'w-3 h-3' : size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const textClass = size === 'xs' ? 'text-[10px]' : size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div className={`inline-flex flex-col gap-1 ${className}`}>
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200/90 text-amber-950 font-bold ${textClass} shadow-2xs`}
        title={`التقييم: ${starsCount} من 6 نجوم`}
      >
        {/* Star icons out of 6 */}
        <div className="flex items-center gap-0.5" dir="ltr">
          {[1, 2, 3, 4, 5, 6].map((idx) => {
            const isFilled = idx <= starsCount;
            return (
              <Star
                key={idx}
                className={`${starIconSize} ${
                  isFilled
                    ? 'text-amber-500 fill-amber-400'
                    : 'text-stone-300 fill-stone-100'
                } transition-all`}
              />
            );
          })}
        </div>

        {/* Numeric Badge */}
        <span className="font-extrabold text-amber-900 pr-0.5">
          {starsCount}/6 <span className="text-[10px] font-semibold text-amber-700">نجوم</span>
        </span>

        {showDetailsToggle && points && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowDetails(!showDetails);
            }}
            className="p-0.5 text-amber-700 hover:text-amber-900 cursor-pointer"
            title="عرض تفاصيل النقاط"
          >
            {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      {/* Optional breakdown pills */}
      {(showDetails || (!showDetailsToggle && points)) && points && (
        <div className="flex flex-wrap items-center gap-1 text-[10px] text-stone-600 pt-0.5" dir="rtl">
          <span
            className={`px-1.5 py-0.5 rounded-md border ${
              points.attendance > 0
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-stone-50 text-stone-400 border-stone-200'
            }`}
          >
            الحضور: {points.attendance}/1 ⭐
          </span>
          <span
            className={`px-1.5 py-0.5 rounded-md border ${
              points.hifz > 0
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-stone-50 text-stone-400 border-stone-200'
            }`}
          >
            الحفظ: {points.hifz}/2 ⭐
          </span>
          <span
            className={`px-1.5 py-0.5 rounded-md border ${
              points.murajaah > 0
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-stone-50 text-stone-400 border-stone-200'
            }`}
          >
            المراجعة: {points.murajaah}/1 ⭐
          </span>
          <span
            className={`px-1.5 py-0.5 rounded-md border ${
              points.discipline > 0
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-stone-50 text-stone-400 border-stone-200'
            }`}
          >
            الانضباط: {points.discipline}/1 ⭐
          </span>
          <span
            className={`px-1.5 py-0.5 rounded-md border ${
              points.attire > 0
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-stone-50 text-stone-400 border-stone-200'
            }`}
          >
            اللبس: {points.attire}/1 ⭐
          </span>
        </div>
      )}
    </div>
  );
};
