import React, { useState, useMemo } from 'react';
import { LeaderboardEntry } from '../types';
import { getLeaderboard, getHalaqat } from '../utils/storage';
import { formatNumberEn } from '../utils/format';
import { scoreArabicNameSearch } from '../utils/arabicSearch';
import {
  Award,
  BookOpen,
  Search,
  Users,
  Trophy,
  Star,
  CheckCircle2,
  CalendarCheck,
  RotateCcw,
  X,
  Layers,
} from 'lucide-react';

export type LeaderboardSortMode = 'overall' | 'attendance' | 'stars';

interface LeaderboardViewProps {
  currentStudentId?: string;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ currentStudentId }) => {
  const [selectedHalaqah, setSelectedHalaqah] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<LeaderboardSortMode>('overall');

  const halaqat = useMemo(() => getHalaqat(), []);

  // Compute leaderboard with current sort mode
  const rawLeaderboard: LeaderboardEntry[] = useMemo(() => {
    return getLeaderboard();
  }, []);

  const leaderboard: LeaderboardEntry[] = useMemo(() => {
    return [...rawLeaderboard].sort((a, b) => {
      if (sortBy === 'attendance') {
        const diffPresent = (b.totalPresent || 0) - (a.totalPresent || 0);
        if (diffPresent !== 0) return diffPresent;
        return (a.totalAbsents || 0) - (b.totalAbsents || 0);
      }
      if (sortBy === 'stars') {
        return (b.totalStars || 0) - (a.totalStars || 0);
      }
      // default: overall (memorized ayahs, then ajza)
      const diffMem = (b.totalMemorizedAyahs || 0) - (a.totalMemorizedAyahs || 0);
      if (diffMem !== 0) return diffMem;
      return (b.completedAjzaCount || 0) - (a.completedAjzaCount || 0);
    });
  }, [rawLeaderboard, sortBy]);

  // Filtering by halaqah and student search
  const filteredEntries = useMemo(() => {
    return leaderboard
      .filter((entry) => {
        const matchesHalaqah =
          selectedHalaqah === 'all' || entry.halaqahName === selectedHalaqah;
        const matchesSearch =
          !searchQuery.trim() ||
          scoreArabicNameSearch(entry.studentName, searchQuery) > 0 ||
          scoreArabicNameSearch(entry.halaqahName, searchQuery) > 0;
        return matchesHalaqah && matchesSearch;
      })
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));
  }, [leaderboard, selectedHalaqah, searchQuery]);

  const hasActiveFilters = selectedHalaqah !== 'all' || searchQuery.trim().length > 0;

  const resetFilters = () => {
    setSelectedHalaqah('all');
    setSearchQuery('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-emerald-950 to-stone-900 text-white rounded-3xl p-6 sm:p-7 border border-stone-800 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
              <Trophy className="w-3.5 h-3.5" />
              <span>لوحة الشرف والتنافس القرآني</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black">أوائل حفّاظ جامع الوالدين</h2>
          </div>

          <div className="flex items-center gap-3 bg-stone-900/80 border border-stone-800 p-3.5 rounded-2xl">
            <Users className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="text-lg font-black text-white">{formatNumberEn(leaderboard.length)}</div>
              <div className="text-[10px] text-stone-400">إجمالي الحفّاظ</div>
            </div>
          </div>
        </div>
      </div>

      {/* The 3 Main Category Buttons Requested by User */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200 shadow-xs space-y-4">
        {/* Section Heading */}
        <div className="flex items-center justify-between">
          <div className="text-xs font-black text-stone-700 flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-700" />
            <span>تصنيف لوحة الشرف:</span>
          </div>
        </div>

        {/* 3 Main Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Button 1: Overall (آيات الحفظ والمراجعة وعدد الأجزاء المحفوظة) */}
          <button
            type="button"
            onClick={() => setSortBy('overall')}
            className={`p-3.5 sm:p-4 rounded-2xl border text-right transition-all flex items-start gap-3 cursor-pointer group ${
              sortBy === 'overall'
                ? 'bg-emerald-800 text-white border-emerald-900 shadow-md ring-2 ring-emerald-600/30'
                : 'bg-stone-50 hover:bg-emerald-50/60 text-stone-800 border-stone-200 hover:border-emerald-300'
            }`}
          >
            <div
              className={`p-2.5 rounded-xl shrink-0 transition-colors ${
                sortBy === 'overall'
                  ? 'bg-white/20 text-amber-300'
                  : 'bg-white text-emerald-800 border border-stone-200 group-hover:border-emerald-300'
              }`}
            >
              <Trophy className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-sm sm:text-base leading-snug">
                الترتيب العام
              </div>
              <div
                className={`text-xs mt-1 leading-relaxed ${
                  sortBy === 'overall' ? 'text-emerald-100 font-medium' : 'text-stone-500'
                }`}
              >
                آيات وسور الحفظ والمراجعة وعدد الأجزاء
              </div>
            </div>
          </button>

          {/* Button 2: Attendance (الحضور والالتزام) */}
          <button
            type="button"
            onClick={() => setSortBy('attendance')}
            className={`p-3.5 sm:p-4 rounded-2xl border text-right transition-all flex items-start gap-3 cursor-pointer group ${
              sortBy === 'attendance'
                ? 'bg-emerald-800 text-white border-emerald-900 shadow-md ring-2 ring-emerald-600/30'
                : 'bg-stone-50 hover:bg-emerald-50/60 text-stone-800 border-stone-200 hover:border-emerald-300'
            }`}
          >
            <div
              className={`p-2.5 rounded-xl shrink-0 transition-colors ${
                sortBy === 'attendance'
                  ? 'bg-white/20 text-amber-300'
                  : 'bg-white text-emerald-800 border border-stone-200 group-hover:border-emerald-300'
              }`}
            >
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-sm sm:text-base leading-snug">
                الحضور والالتزام
              </div>
              <div
                className={`text-xs mt-1 leading-relaxed ${
                  sortBy === 'attendance' ? 'text-emerald-100 font-medium' : 'text-stone-500'
                }`}
              >
                أيام الحضور وأقل أيام غياب (خلال الأسبوع الحالي)
              </div>
            </div>
          </button>

          {/* Button 3: Total Stars (مجموع النجوم) */}
          <button
            type="button"
            onClick={() => setSortBy('stars')}
            className={`p-3.5 sm:p-4 rounded-2xl border text-right transition-all flex items-start gap-3 cursor-pointer group ${
              sortBy === 'stars'
                ? 'bg-emerald-800 text-white border-emerald-900 shadow-md ring-2 ring-emerald-600/30'
                : 'bg-stone-50 hover:bg-emerald-50/60 text-stone-800 border-stone-200 hover:border-emerald-300'
            }`}
          >
            <div
              className={`p-2.5 rounded-xl shrink-0 transition-colors ${
                sortBy === 'stars'
                  ? 'bg-white/20 text-amber-300'
                  : 'bg-white text-amber-500 border border-stone-200 group-hover:border-amber-300'
              }`}
            >
              <Star className="w-5 h-5 fill-current" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-sm sm:text-base leading-snug">
                مجموع النجوم
              </div>
              <div
                className={`text-xs mt-1 leading-relaxed ${
                  sortBy === 'stars' ? 'text-emerald-100 font-medium' : 'text-stone-500'
                }`}
              >
                إجمالي رصيد النجوم ونقاط جلسات التسميع
              </div>
            </div>
          </button>
        </div>

        {/* Search & Halaqah Filter Row */}
        <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search by Student Name */}
          <div className="relative flex-1 w-full sm:max-w-xs min-w-0">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث باسم الطالب أو الحلقة..."
              className="w-full pl-9 pr-9 py-2 rounded-xl border border-stone-300 text-xs font-medium text-stone-800 placeholder-stone-400 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all"
            />
            <Search className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-stone-400 hover:text-stone-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Halaqah Dropdown Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative min-w-0 flex-1 sm:flex-none">
              <select
                value={selectedHalaqah}
                onChange={(e) => setSelectedHalaqah(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-800 bg-stone-50 focus:bg-white focus:outline-none"
              >
                <option value="all">جميع الحلقات</option>
                {halaqat.map((h) => (
                  <option key={h.id} value={h.name}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors cursor-pointer bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-xl border border-rose-200 shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                <span>إلغاء التصفية</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      {filteredEntries.length >= 3 && !searchQuery && selectedHalaqah === 'all' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 2nd Place */}
          <div className="bg-stone-50 border border-stone-300 rounded-2xl p-4 flex flex-col items-center text-center gap-2 relative order-2 md:order-1">
            <div className="w-10 h-10 rounded-full bg-stone-300 text-stone-800 flex items-center justify-center font-black text-sm border-2 border-stone-400 shadow-xs">
              {formatNumberEn(2)}
            </div>
            <div className="text-xs font-bold text-stone-500">المركز الثاني</div>
            <div className="font-extrabold text-stone-900 text-sm">
              {filteredEntries[1].studentName}
            </div>
            <div className="text-[11px] text-stone-500">{filteredEntries[1].halaqahName}</div>

            <div className="pt-3 border-t border-stone-200/90 w-full grid grid-cols-3 gap-1 sm:gap-2 text-center text-xs">
              {sortBy === 'overall' && (
                <>
                  <div className="flex flex-col items-center justify-center text-center min-w-0">
                    <span className="font-black text-stone-900 text-sm leading-tight text-center">{formatNumberEn(filteredEntries[1].totalMemorizedAyahs)}</span>
                    <span className="text-[10px] text-stone-500 font-bold text-center leading-tight whitespace-nowrap">آية محفوظة</span>
                  </div>
                  <div className="flex flex-col items-center justify-center text-center min-w-0">
                    <span className="font-bold text-teal-800 text-sm leading-tight text-center">{formatNumberEn(filteredEntries[1].totalReviewedAyahs)}</span>
                    <span className="text-[10px] text-stone-500 font-bold text-center leading-tight whitespace-nowrap">آية مراجعة</span>
                  </div>
                  <div className="flex flex-col items-center justify-center text-center min-w-0">
                    <span className="font-black text-stone-800 text-sm leading-tight text-center">{formatNumberEn(filteredEntries[1].completedAjzaCount)}</span>
                    <span className="text-[10px] text-stone-500 font-bold text-center leading-tight whitespace-nowrap">أجزاء</span>
                  </div>
                </>
              )}

              {sortBy === 'attendance' && (
                <>
                  <div className="px-1 py-1 rounded-xl bg-emerald-100 border border-emerald-300 flex flex-col items-center justify-center text-center min-w-0">
                    <span className="font-black text-emerald-900 text-sm flex items-center justify-center gap-0.5 text-center">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>{formatNumberEn(filteredEntries[1].totalPresent || 0)}</span>
                    </span>
                    <span className="text-[10px] text-emerald-950 font-black text-center whitespace-nowrap">أيام الحضور</span>
                  </div>
                  <div className="flex flex-col items-center justify-center text-center min-w-0">
                    <span className="font-bold text-stone-600 text-sm text-center">{formatNumberEn(filteredEntries[1].totalAbsents || 0)}</span>
                    <span className="text-[10px] text-stone-500 font-bold text-center whitespace-nowrap">أيام الغياب</span>
                  </div>
                  <div className="flex flex-col items-center justify-center text-center min-w-0">
                    <span className="font-black text-stone-900 text-sm text-center">{formatNumberEn(filteredEntries[1].totalMemorizedAyahs)}</span>
                    <span className="text-[10px] text-stone-500 font-bold text-center whitespace-nowrap">آية محفوظة</span>
                  </div>
                </>
              )}

              {sortBy === 'stars' && (
                <>
                  <div className="px-1 py-1 rounded-xl bg-amber-100 border border-amber-300 flex flex-col items-center justify-center text-center min-w-0">
                    <span className="font-black text-amber-900 text-sm flex items-center justify-center gap-0.5 text-center">
                      <Star className="w-3.5 h-3.5 text-amber-600 fill-current shrink-0" />
                      <span>{formatNumberEn(filteredEntries[1].totalStars || 0)}</span>
                    </span>
                    <span className="text-[10px] text-amber-950 font-black text-center whitespace-nowrap">مجموع النجوم</span>
                  </div>
                  <div className="flex flex-col items-center justify-center text-center min-w-0">
                    <span className="font-black text-stone-800 text-sm text-center">{formatNumberEn(filteredEntries[1].completedAjzaCount)}</span>
                    <span className="text-[10px] text-stone-500 font-bold text-center whitespace-nowrap">أجزاء</span>
                  </div>
                  <div className="flex flex-col items-center justify-center text-center min-w-0">
                    <span className="font-black text-stone-900 text-sm text-center">{formatNumberEn(filteredEntries[1].totalMemorizedAyahs)}</span>
                    <span className="text-[10px] text-stone-500 font-bold text-center whitespace-nowrap">آية محفوظة</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 1st Place */}
          <div className="bg-gradient-to-b from-amber-50 to-amber-100/40 border-2 border-amber-400 rounded-3xl p-5 flex flex-col items-center text-center gap-2 relative order-1 md:order-2 shadow-md">
            <div className="w-12 h-12 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center font-black text-base border-2 border-amber-500 shadow-xs">
              {formatNumberEn(1)}
            </div>
            <div className="text-xs font-bold text-amber-800">المركز الأول</div>
            <div className="font-black text-stone-900 text-base">
              {filteredEntries[0].studentName}
            </div>
            <div className="text-[11px] text-stone-600">{filteredEntries[0].halaqahName}</div>

            <div className="pt-3 border-t border-amber-300/90 w-full grid grid-cols-3 gap-1 sm:gap-2 text-center text-xs">
              {sortBy === 'overall' && (
                <>
                  <div className="flex flex-col items-center justify-center text-center min-w-0">
                    <span className="font-black text-stone-900 text-sm leading-tight text-center">
                      {formatNumberEn(filteredEntries[0].totalMemorizedAyahs)}
                    </span>
                    <span className="text-[10px] text-stone-600 font-bold text-center leading-tight whitespace-nowrap">آية محفوظة</span>
                  </div>
                  <div className="flex flex-col items-center justify-center text-center min-w-0">
                    <span className="font-black text-teal-800 text-sm leading-tight text-center">
                      {formatNumberEn(filteredEntries[0].totalReviewedAyahs)}
                    </span>
                    <span className="text-[10px] text-stone-600 font-bold text-center leading-tight whitespace-nowrap">آية مراجعة</span>
                  </div>
                  <div className="flex flex-col items-center justify-center text-center min-w-0">
                    <span className="font-black text-stone-900 text-sm leading-tight text-center">
                      {formatNumberEn(filteredEntries[0].completedAjzaCount)}
                    </span>
                    <span className="text-[10px] text-stone-600 font-bold text-center leading-tight whitespace-nowrap">أجزاء</span>
                  </div>
                </>
              )}

              {sortBy === 'attendance' && (
                <>
                  <div className="px-1 py-1 rounded-xl bg-emerald-100 border border-emerald-300 flex flex-col items-center justify-center text-center min-w-0">
                    <span className="font-black text-emerald-900 text-sm flex items-center justify-center gap-0.5 text-center">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>{formatNumberEn(filteredEntries[0].totalPresent || 0)}</span>
                    </span>
                    <span className="text-[10px] text-emerald-950 font-black text-center whitespace-nowrap">أيام الحضور</span>
                  </div>
                  <div className="flex flex-col items-center justify-center text-center min-w-0">
                    <span className="font-bold text-stone-600 text-sm text-center">
                      {formatNumberEn(filteredEntries[0].totalAbsents || 0)}
                    </span>
                    <span className="text-[10px] text-stone-600 font-bold text-center whitespace-nowrap">أيام الغياب</span>
                  </div>
                  <div className="flex flex-col items-center justify-center text-center min-w-0">
                    <span className="font-black text-stone-900 text-sm text-center">
                      {formatNumberEn(filteredEntries[0].totalMemorizedAyahs)}
                    </span>
                    <span className="text-[10px] text-stone-600 font-bold text-center whitespace-nowrap">آية محفوظة</span>
                  </div>
                </>
              )}

              {sortBy === 'stars' && (
                <>
                  <div className="px-1 py-1 rounded-xl bg-amber-100 border border-amber-300 flex flex-col items-center justify-center text-center min-w-0">
                    <span className="font-black text-amber-900 text-sm flex items-center justify-center gap-0.5 text-center">
                      <Star className="w-4 h-4 text-amber-600 fill-current shrink-0" />
                      <span>{formatNumberEn(filteredEntries[0].totalStars || 0)}</span>
                    </span>
                    <span className="text-[10px] text-amber-950 font-black text-center whitespace-nowrap">مجموع النجوم</span>
                  </div>
                  <div className="flex flex-col items-center justify-center text-center min-w-0">
                    <span className="font-black text-stone-900 text-sm text-center">
                      {formatNumberEn(filteredEntries[0].completedAjzaCount)}
                    </span>
                    <span className="text-[10px] text-stone-600 font-bold text-center whitespace-nowrap">أجزاء</span>
                  </div>
                  <div className="flex flex-col items-center justify-center text-center min-w-0">
                    <span className="font-black text-stone-900 text-sm text-center">
                      {formatNumberEn(filteredEntries[0].totalMemorizedAyahs)}
                    </span>
                    <span className="text-[10px] text-stone-600 font-bold text-center whitespace-nowrap">آية محفوظة</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 3rd Place */}
          <div className="bg-amber-900/5 border border-amber-800/20 rounded-2xl p-4 flex flex-col items-center text-center gap-2 relative order-3">
            <div className="w-10 h-10 rounded-full bg-amber-700/20 text-amber-900 flex items-center justify-center font-black text-sm border-2 border-amber-800/30 shadow-xs">
              {formatNumberEn(3)}
            </div>
            <div className="text-xs font-bold text-amber-800">المركز الثالث</div>
            <div className="font-extrabold text-stone-900 text-sm">
              {filteredEntries[2].studentName}
            </div>
            <div className="text-[11px] text-stone-500">{filteredEntries[2].halaqahName}</div>

            <div className="pt-3 border-t border-stone-200/90 w-full grid grid-cols-3 gap-1 sm:gap-2 text-center text-xs">
              {sortBy === 'overall' && (
                <>
                  <div className="flex flex-col items-center justify-center text-center min-w-0">
                    <span className="font-black text-stone-900 text-sm leading-tight text-center">{formatNumberEn(filteredEntries[2].totalMemorizedAyahs)}</span>
                    <span className="text-[10px] text-stone-500 font-bold text-center leading-tight whitespace-nowrap">آية محفوظة</span>
                  </div>
                  <div className="flex flex-col items-center justify-center text-center min-w-0">
                    <span className="font-bold text-teal-800 text-sm leading-tight text-center">{formatNumberEn(filteredEntries[2].totalReviewedAyahs)}</span>
                    <span className="text-[10px] text-stone-500 font-bold text-center leading-tight whitespace-nowrap">آية مراجعة</span>
                  </div>
                  <div className="flex flex-col items-center justify-center text-center min-w-0">
                    <span className="font-black text-stone-800 text-sm leading-tight text-center">{formatNumberEn(filteredEntries[2].completedAjzaCount)}</span>
                    <span className="text-[10px] text-stone-500 font-bold text-center leading-tight whitespace-nowrap">أجزاء</span>
                  </div>
                </>
              )}

              {sortBy === 'attendance' && (
                <>
                  <div className="px-1 py-1 rounded-xl bg-emerald-100 border border-emerald-300 flex flex-col items-center justify-center text-center min-w-0">
                    <span className="font-black text-emerald-900 text-sm flex items-center justify-center gap-0.5 text-center">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>{formatNumberEn(filteredEntries[2].totalPresent || 0)}</span>
                    </span>
                    <span className="text-[10px] text-emerald-950 font-black text-center whitespace-nowrap">أيام الحضور</span>
                  </div>
                  <div className="flex flex-col items-center justify-center text-center min-w-0">
                    <span className="font-bold text-stone-600 text-sm text-center">{formatNumberEn(filteredEntries[2].totalAbsents || 0)}</span>
                    <span className="text-[10px] text-stone-500 font-bold text-center whitespace-nowrap">أيام الغياب</span>
                  </div>
                  <div className="flex flex-col items-center justify-center text-center min-w-0">
                    <span className="font-black text-stone-900 text-sm text-center">{formatNumberEn(filteredEntries[2].totalMemorizedAyahs)}</span>
                    <span className="text-[10px] text-stone-500 font-bold text-center whitespace-nowrap">آية محفوظة</span>
                  </div>
                </>
              )}

              {sortBy === 'stars' && (
                <>
                  <div className="px-1 py-1 rounded-xl bg-amber-100 border border-amber-300 flex flex-col items-center justify-center text-center min-w-0">
                    <span className="font-black text-amber-900 text-sm flex items-center justify-center gap-0.5 text-center">
                      <Star className="w-3.5 h-3.5 text-amber-600 fill-current shrink-0" />
                      <span>{formatNumberEn(filteredEntries[2].totalStars || 0)}</span>
                    </span>
                    <span className="text-[10px] text-amber-950 font-black text-center whitespace-nowrap">مجموع النجوم</span>
                  </div>
                  <div className="flex flex-col items-center justify-center text-center min-w-0">
                    <span className="font-black text-stone-800 text-sm text-center">{formatNumberEn(filteredEntries[2].completedAjzaCount)}</span>
                    <span className="text-[10px] text-stone-500 font-bold text-center whitespace-nowrap">أجزاء</span>
                  </div>
                  <div className="flex flex-col items-center justify-center text-center min-w-0">
                    <span className="font-black text-stone-900 text-sm text-center">{formatNumberEn(filteredEntries[2].totalMemorizedAyahs)}</span>
                    <span className="text-[10px] text-stone-500 font-bold text-center whitespace-nowrap">آية محفوظة</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-100 flex items-center justify-between flex-wrap gap-2">
          <div className="font-bold text-sm text-stone-900 flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-700" />
            <span>
              {sortBy === 'overall' ? 'الترتيب العام' : 'ترتيب الطلاب'}
            </span>
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <div className="font-bold text-sm text-stone-800">لا يوجد طلاب مطابقون لمعايير البحث المحددة</div>
            <p className="text-stone-500 text-xs max-w-sm mx-auto">
              جرّب تغيير كلمة البحث أو اختيار حلقة أخرى.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة ضبط البحث</span>
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filteredEntries.map((entry) => {
              const isCurrent = currentStudentId === entry.studentId;

              return (
                <div
                  key={entry.studentId}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    isCurrent ? 'bg-emerald-50/80 border-r-4 border-r-emerald-700' : 'hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        entry.rank === 1
                          ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-300'
                          : entry.rank === 2
                          ? 'bg-stone-300 text-stone-800'
                          : entry.rank === 3
                          ? 'bg-amber-200 text-amber-900'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {formatNumberEn(entry.rank)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-stone-900 text-sm truncate">
                          {entry.studentName}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-700 text-white font-bold shrink-0">
                            حسابك
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-stone-500 truncate">{entry.halaqahName}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 text-xs flex-wrap justify-center sm:justify-end shrink-0 w-full sm:w-auto">
                    {/* Mode-specific primary highlighted metrics */}

                    {/* Overall Mode: Highlights Memorized Ayahs, Reviewed Ayahs, and Ajza */}
                    {sortBy === 'overall' && (
                      <>
                        <div className="text-center min-w-[75px] p-1.5 rounded-xl bg-emerald-50 border border-emerald-300">
                          <div className="font-black text-emerald-950 text-sm">
                            {formatNumberEn(entry.totalMemorizedAyahs)}
                          </div>
                          <div className="text-[10px] text-emerald-800 font-bold">
                            آية حفظ ({formatNumberEn(entry.memorizedPercentage)}%)
                          </div>
                        </div>

                        <div className="text-center min-w-[70px] p-1.5 rounded-xl bg-teal-50 border border-teal-300">
                          <div className="font-black text-teal-950 text-sm">
                            {formatNumberEn(entry.totalReviewedAyahs)}
                          </div>
                          <div className="text-[10px] text-teal-800 font-bold">آية مراجعة</div>
                        </div>

                        <div className="text-center min-w-[65px] p-1.5 rounded-xl bg-stone-100 border border-stone-300">
                          <div className="font-black text-stone-900 text-sm">
                            {formatNumberEn(entry.completedAjzaCount)}
                          </div>
                          <div className="text-[10px] text-stone-700 font-bold">أجزاء مكتملة</div>
                        </div>

                        <div className="w-px h-6 bg-stone-200 hidden sm:block shrink-0" />

                        {/* Secondary stats in overall mode */}
                        <div className="text-center min-w-[60px]">
                          <div className="font-bold text-stone-700 text-sm">
                            {formatNumberEn(entry.completedSurahsCount || 0)}
                          </div>
                          <div className="text-[10px] text-stone-500">سور</div>
                        </div>

                        <div className="text-center min-w-[65px]">
                          <div className="font-bold text-emerald-800 text-sm flex items-center justify-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>{formatNumberEn(entry.totalPresent || 0)}</span>
                          </div>
                          <div className="text-[10px] text-stone-500">حضور</div>
                        </div>
                      </>
                    )}

                    {/* Attendance Mode: Highlights Days Attended, Absents, and Attendance Rate */}
                    {sortBy === 'attendance' && (
                      <>
                        <div className="text-center min-w-[85px] p-1.5 rounded-xl bg-emerald-100 border border-emerald-400 ring-1 ring-emerald-500/20">
                          <div className="font-black text-emerald-950 text-sm flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                            <span>{formatNumberEn(entry.totalPresent || 0)}</span>
                          </div>
                          <div className="text-[10px] text-emerald-900 font-black">أيام الحضور</div>
                        </div>

                        <div className="text-center min-w-[65px] p-1.5 rounded-xl bg-rose-50 border border-rose-200">
                          <div className={`font-black text-sm ${(entry.totalAbsents || 0) > 0 ? 'text-rose-700' : 'text-stone-500'}`}>
                            {formatNumberEn(entry.totalAbsents || 0)}
                          </div>
                          <div className="text-[10px] text-rose-800 font-bold">أيام الغياب</div>
                        </div>

                        <div className="w-px h-6 bg-stone-200 hidden sm:block shrink-0" />

                        <div className="text-center min-w-[70px]">
                          <div className="font-bold text-stone-800 text-sm">
                            {formatNumberEn(entry.totalMemorizedAyahs)}
                          </div>
                          <div className="text-[10px] text-stone-500">آية محفوظة</div>
                        </div>

                        <div className="text-center min-w-[60px]">
                          <div className="font-bold text-stone-800 text-sm">
                            {formatNumberEn(entry.completedSurahsCount || 0)}
                          </div>
                          <div className="text-[10px] text-stone-500">سور</div>
                        </div>
                      </>
                    )}

                    {/* Stars Mode: Highlights Total Stars, Memorized Ayahs, Surahs, and Attendance */}
                    {sortBy === 'stars' && (
                      <>
                        <div className="text-center min-w-[85px] p-1.5 rounded-xl bg-amber-100 border border-amber-400 ring-1 ring-amber-500/20">
                          <div className="font-black text-amber-950 text-sm flex items-center justify-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                            <span>{formatNumberEn(entry.totalStars || 0)}</span>
                          </div>
                          <div className="text-[10px] text-amber-900 font-black">مجموع النجوم</div>
                        </div>

                        <div className="text-center min-w-[70px] p-1.5 rounded-xl bg-stone-100 border border-stone-300">
                          <div className="font-black text-stone-900 text-sm">
                            {formatNumberEn(entry.completedAjzaCount)}
                          </div>
                          <div className="text-[10px] text-stone-700 font-bold">أجزاء مكتملة</div>
                        </div>

                        <div className="w-px h-6 bg-stone-200 hidden sm:block shrink-0" />

                        <div className="text-center min-w-[70px]">
                          <div className="font-bold text-stone-800 text-sm">
                            {formatNumberEn(entry.totalMemorizedAyahs)}
                          </div>
                          <div className="text-[10px] text-stone-500">آية محفوظة</div>
                        </div>

                        <div className="text-center min-w-[60px]">
                          <div className="font-bold text-stone-800 text-sm">
                            {formatNumberEn(entry.completedSurahsCount || 0)}
                          </div>
                          <div className="text-[10px] text-stone-500">سور</div>
                        </div>

                        <div className="text-center min-w-[65px]">
                          <div className="font-bold text-emerald-800 text-sm flex items-center justify-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>{formatNumberEn(entry.totalPresent || 0)}</span>
                          </div>
                          <div className="text-[10px] text-stone-500">حضور</div>
                        </div>
                      </>
                    )}

                    {/* Total Stars badge (common across all modes) */}
                    <div className="w-px h-6 bg-stone-200 hidden sm:block shrink-0" />
                    <div className="text-center min-w-[55px]">
                      <div className="font-black text-amber-700 text-sm flex items-center justify-center gap-0.5">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        <span>{formatNumberEn(entry.totalStars || 0)}</span>
                      </div>
                      <div className="text-[10px] text-stone-400">نجوم</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
