import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  getMemorizationGrowthTimeline,
  GrowthTimelinePoint,
  getStudents,
  calculateStudentStats,
} from '../utils/storage';
import { TrendingUp } from 'lucide-react';
import { formatNumberEn } from '../utils/format';

interface GrowthChartProps {
  halaqahId?: string;
  studentId?: string;
  title?: string;
  subtitle?: string | null;
  compact?: boolean;
  timelineLabel?: string;
}

export const GrowthChart: React.FC<GrowthChartProps> = ({
  halaqahId,
  studentId,
  title = 'مسار النمو والتحصيل القرآني',
  subtitle = null,
  compact = false,
  timelineLabel = 'النمو البياني',
}) => {
  const rawTimelineData: GrowthTimelinePoint[] = getMemorizationGrowthTimeline(halaqahId, studentId);

  // If viewing an individual student who has no logs or only 1 log,
  // prepare baseline points so the AreaChart always draws the student's growth trajectory
  let timelineData = rawTimelineData;
  if (studentId && (!timelineData || timelineData.length === 0)) {
    const student = getStudents().find((s) => s.id === studentId);
    const stats = calculateStudentStats(studentId);
    const baseDate = student?.registeredAt ? student.registeredAt.split('T')[0] : new Date().toISOString().split('T')[0];
    const dateObj = new Date(baseDate);
    const displayDate = dateObj.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });

    timelineData = [
      {
        date: 'البداية',
        displayDate: 'البداية',
        memorized: 0,
        reviewed: 0,
        cumulativeMemorized: 0,
        presentCount: 0,
        absentCount: 0,
      },
      {
        date: baseDate,
        displayDate,
        memorized: stats.totalMemorizedAyahs,
        reviewed: stats.totalReviewedAyahs,
        cumulativeMemorized: stats.totalMemorizedAyahs,
        presentCount: stats.totalPresent || 1,
        absentCount: stats.totalAbsents || 0,
      },
    ];
  } else if (studentId && timelineData && timelineData.length === 1) {
    // Add a starting 0 point if only 1 day is logged so line renders across
    timelineData = [
      {
        date: 'البداية',
        displayDate: 'البداية',
        memorized: 0,
        reviewed: 0,
        cumulativeMemorized: 0,
        presentCount: 0,
        absentCount: 0,
      },
      timelineData[0],
    ];
  }

  const hasTimelineData = timelineData && timelineData.length > 0;

  return (
    <div
      id="growth-chart-container"
      className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-6 border border-emerald-950/10 shadow-xs space-y-3 sm:space-y-4 w-full max-w-full overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <h3 className="text-xs sm:text-base font-bold text-emerald-950 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700 shrink-0" />
            <span className="truncate">{title}</span>
          </h3>
          {subtitle && (
            <p className="text-[10px] sm:text-xs text-emerald-950/60 mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>

        {/* Label Badge on left */}
        <div className="shrink-0 flex items-center justify-end">
          <span className="inline-flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-emerald-800 text-white text-[10px] sm:text-xs font-bold shadow-2xs whitespace-nowrap">
            {timelineLabel}
          </span>
        </div>
      </div>

      {/* Legend Bar - Centered softly rounded pills matching laptop design */}
      <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 py-1 w-full max-w-full select-none flex-nowrap" dir="rtl">
        <div className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl bg-emerald-50/90 border border-emerald-200 text-emerald-800 text-[10px] sm:text-xs font-bold shadow-2xs whitespace-nowrap shrink-0">
          <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-emerald-600 shrink-0 shadow-2xs" />
          <span>الحفظ اليومي</span>
        </div>
        <div className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl bg-teal-50/90 border border-teal-200 text-teal-800 text-[10px] sm:text-xs font-bold shadow-2xs whitespace-nowrap shrink-0">
          <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-teal-600 shrink-0 shadow-2xs" />
          <span>المراجعة</span>
        </div>
        <div className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl bg-blue-50/90 border border-blue-200 text-blue-800 text-[10px] sm:text-xs font-bold shadow-2xs whitespace-nowrap shrink-0">
          <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-blue-600 shrink-0 shadow-2xs" />
          <span>الحضور</span>
        </div>
        <div className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl bg-rose-50/90 border border-rose-200 text-rose-800 text-[10px] sm:text-xs font-bold shadow-2xs whitespace-nowrap shrink-0">
          <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-rose-600 shrink-0 shadow-2xs" />
          <span>الغياب</span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className={`w-full max-w-full overflow-hidden relative ${compact ? 'h-48 sm:h-64' : 'h-60 sm:h-72 md:h-80'}`} dir="ltr">
        {hasTimelineData ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart
              data={timelineData}
              margin={{ top: 8, right: 12, left: 4, bottom: 8 }}
            >
              <defs>
                <linearGradient id="colorMemorized" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorReviewed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="displayDate"
                tick={{ fill: "#064e3b", fontSize: 11, fontWeight: 700, fontFamily: "Cairo, sans-serif" }}
                stroke="#6b7280"
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                width={44}
                tick={{ fill: "#064e3b", fontSize: 11, fontWeight: 700, fontFamily: "Cairo, sans-serif" }}
                stroke="#6b7280"
                allowDecimals={false}
                tickLine={false}
                tickFormatter={(val: number) => formatNumberEn(val)}
              />
              <Tooltip
                formatter={(value: any, name: any) => {
                  const labels: { [k: string]: string } = {
                    memorized: "آيات الحفظ اليومي",
                    reviewed: "آيات المراجعة والتثبيت",
                    presentCount: "مرات الحضور",
                    absentCount: "مرات الغياب",
                    cumulativeMemorized: "تراكمي الآيات المحفوظة",
                  };
                  return [formatNumberEn(value), labels[name] || name];
                }}
                labelFormatter={(label) => `التاريخ: ${label}`}
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderColor: "#10b981",
                  borderRadius: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  direction: "rtl",
                  textAlign: "right",
                  fontSize: "12px",
                  fontWeight: 600,
                  fontFamily: "Cairo, sans-serif",
                }}
              />
              <Area
                type="monotone"
                dataKey="memorized"
                name="memorized"
                stroke="#059669"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorMemorized)"
              />
              <Area
                type="monotone"
                dataKey="reviewed"
                name="reviewed"
                stroke="#0d9488"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorReviewed)"
              />
              <Area
                type="monotone"
                dataKey="presentCount"
                name="presentCount"
                stroke="#2563eb"
                strokeWidth={1.75}
                fill="none"
              />
              <Area
                type="monotone"
                dataKey="absentCount"
                name="absentCount"
                stroke="#e11d48"
                strokeWidth={1.75}
                fill="none"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-center p-6 text-emerald-950/50 text-sm">
            لا توجد سجلات كافية بعد لرسم المنحنى البياني
          </div>
        )}
      </div>
    </div>
  );
};
