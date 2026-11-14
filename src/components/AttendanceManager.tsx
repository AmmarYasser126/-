import React, { useState, useEffect } from 'react';
import {
  Student,
  HalaqahClass,
  AttendanceRecord,
  AttendanceStatus,
} from '../types';
import {
  getStudents,
  getHalaqat,
  getAttendance,
  saveAttendanceRecords,
} from '../utils/storage';
import { ExportModal } from './ExportModal';
import { scoreArabicNameSearch } from '../utils/arabicSearch';
import {
  formatNumberEn,
  formatTimeEn,
  formatDateEn,
} from '../utils/format';
import {
  UserCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Filter,
  CheckCheck,
  Save,
  FileSpreadsheet,
  Download,
  Info,
  ChevronLeft,
  Search,
} from 'lucide-react';

interface AttendanceManagerProps {
  initialHalaqahId?: string;
  teacherHalaqahName?: string;
  lockHalaqah?: boolean;
  readOnly?: boolean;
  hideExport?: boolean;
  teacherName?: string;
  onAttendanceUpdated?: () => void;
  onSelectStudent?: (student: Student) => void;
}

export const AttendanceManager: React.FC<AttendanceManagerProps> = ({
  initialHalaqahId,
  teacherHalaqahName,
  lockHalaqah = false,
  readOnly = false,
  hideExport = false,
  teacherName,
  onAttendanceUpdated,
  onSelectStudent,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedHalaqahId, setSelectedHalaqahId] = useState<string>(
    initialHalaqahId || 'all'
  );
  const [students, setStudents] = useState<Student[]>([]);
  const [halaqat, setHalaqat] = useState<HalaqahClass[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<{
    [studentId: string]: { status: AttendanceStatus; notes: string; createdAt?: string };
  }>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AttendanceStatus>('all');
  const [exportModalConfig, setExportModalConfig] = useState<{
    isOpen: boolean;
    records: AttendanceRecord[];
    className?: string;
    date?: string;
  }>({
    isOpen: false,
    records: [],
  });

  const refreshData = () => {
    setStudents(getStudents());
    setHalaqat(getHalaqat());
  };

  useEffect(() => {
    refreshData();
    const handleDataUpdate = () => {
      refreshData();
    };
    window.addEventListener('tahfeeth_data_updated', handleDataUpdate);
    return () => window.removeEventListener('tahfeeth_data_updated', handleDataUpdate);
  }, []);

  useEffect(() => {
    if (initialHalaqahId) {
      setSelectedHalaqahId(initialHalaqahId);
    }
  }, [initialHalaqahId]);

  // Load existing records for selected date
  useEffect(() => {
    const records = getAttendance(selectedDate);
    const map: { [studentId: string]: { status: AttendanceStatus; notes: string; createdAt?: string } } = {};

    records.forEach(r => {
      map[r.studentId] = {
        status: r.status,
        notes: r.notes || '',
        createdAt: r.createdAt,
      };
    });

    setAttendanceMap(map);
  }, [selectedDate]);

  const targetHalaqahId = lockHalaqah && initialHalaqahId ? initialHalaqahId : selectedHalaqahId;
  const searchTrimmed = searchQuery.trim();

  const filteredStudents = (() => {
    const scoredList: { student: Student; score: number }[] = [];

    for (const s of students) {
      if (targetHalaqahId !== 'all') {
        const matchById = s.halaqahId === targetHalaqahId;
        const matchedHalaqah = halaqat.find(h => h.id === targetHalaqahId);
        const matchByName = (matchedHalaqah && s.halaqahName === matchedHalaqah.name) ||
          (teacherHalaqahName && s.halaqahName === teacherHalaqahName);
        if (!matchById && !matchByName) {
          continue;
        }
      }

      let score = 1;
      if (searchTrimmed) {
        score = scoreArabicNameSearch(s.fullName, searchTrimmed, [
          s.rawPhoneNumber,
          s.email,
        ]);
        if (score === 0) {
          continue;
        }
      }

      if (statusFilter !== 'all') {
        const status = attendanceMap[s.id]?.status || 'present';
        if (status !== statusFilter) continue;
      }

      scoredList.push({ student: s, score });
    }

    if (searchTrimmed) {
      scoredList.sort((a, b) => b.score - a.score);
    }

    return scoredList.map(item => item.student);
  })();

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    if (readOnly) return;
    setAttendanceMap(prev => ({
      ...prev,
      [studentId]: {
        status,
        notes: prev[studentId]?.notes || '',
        createdAt: prev[studentId]?.createdAt,
      },
    }));
  };

  const handleNotesChange = (studentId: string, notes: string) => {
    if (readOnly) return;
    setAttendanceMap(prev => ({
      ...prev,
      [studentId]: {
        status: prev[studentId]?.status || 'present',
        notes,
        createdAt: prev[studentId]?.createdAt,
      },
    }));
  };

  const handleMarkAllPresent = () => {
    if (readOnly) return;
    const updated = { ...attendanceMap };
    filteredStudents.forEach(s => {
      updated[s.id] = {
        status: 'present',
        notes: updated[s.id]?.notes || '',
        createdAt: updated[s.id]?.createdAt,
      };
    });
    setAttendanceMap(updated);
  };

  const handleSaveAttendance = () => {
    if (readOnly) return;
    const recordsToSave: AttendanceRecord[] = filteredStudents.map(student => {
      const existing = attendanceMap[student.id];
      const status: AttendanceStatus = existing?.status || 'present';
      const notes = existing?.notes || '';

      return {
        id: `att_${student.id}_${selectedDate}`,
        studentId: student.id,
        studentName: student.fullName,
        halaqahId: student.halaqahId,
        halaqahName: student.halaqahName,
        date: selectedDate,
        status,
        notes,
        createdAt: existing?.createdAt || new Date().toISOString(),
      };
    });

    saveAttendanceRecords(recordsToSave);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    if (onAttendanceUpdated) {
      onAttendanceUpdated();
    }
  };

  const handleExportCurrentAttendance = () => {
    const currentRecords: AttendanceRecord[] = filteredStudents.map(student => {
      const existing = attendanceMap[student.id];
      return {
        id: `att_${student.id}_${selectedDate}`,
        studentId: student.id,
        studentName: student.fullName,
        halaqahId: student.halaqahId,
        halaqahName: student.halaqahName || currentHalaqahObj?.name || 'حلقة عامة',
        date: selectedDate,
        status: existing?.status || 'present',
        notes: existing?.notes || '',
        createdAt: existing?.createdAt || new Date().toISOString(),
      };
    });

    const currentHalaqahName = currentHalaqahObj ? currentHalaqahObj.name : selectedHalaqahId === 'all' ? 'جميع الحلقات' : 'الحلقة';
    setExportModalConfig({
      isOpen: true,
      records: currentRecords,
      className: currentHalaqahName,
      date: selectedDate,
    });
  };

  const handleExportAllHalaqatAllDates = () => {
    const allRecords = getAttendance();
    setExportModalConfig({
      isOpen: true,
      records: allRecords,
      className: 'السجل العام للحضور',
    });
  };

  // Stats for current view
  const totalCount = filteredStudents.length;
  const presentCount = filteredStudents.filter(
    s => (attendanceMap[s.id]?.status || 'present') === 'present'
  ).length;
  const lateCount = filteredStudents.filter(
    s => attendanceMap[s.id]?.status === 'late'
  ).length;
  const excusedCount = filteredStudents.filter(
    s => attendanceMap[s.id]?.status === 'excused'
  ).length;
  const absentCount = filteredStudents.filter(
    s => attendanceMap[s.id]?.status === 'absent'
  ).length;

  const attendanceRate =
    totalCount > 0
      ? Math.round(((presentCount + lateCount * 0.75 + excusedCount) / totalCount) * 100)
      : 0;

  const currentHalaqahObj = halaqat.find(h => h.id === targetHalaqahId);

  return (
    <div id="attendance-manager-card" className="bg-white rounded-2xl border border-emerald-950/10 shadow-xs overflow-hidden">
      {/* Header - For Teacher attendance recording */}
      {!readOnly && (
        <div className="p-4 sm:p-6 bg-linear-to-l from-emerald-900 to-emerald-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-amber-300">
                <UserCheck className="w-6 h-6 text-amber-400" />
                تحضير الطلاب اليومي
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="btn-mark-all-present"
              type="button"
              onClick={handleMarkAllPresent}
              className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border border-emerald-700 cursor-pointer"
            >
              <CheckCheck className="w-4 h-4 text-emerald-300" />
              تحضير الكل كحاضر
            </button>
          </div>
        </div>
      )}

      {/* Controls Bar */}
      <div className="p-4 bg-emerald-50/60 border-b border-emerald-950/10 space-y-3.5">
        {/* Top Controls Row: Filter, Search, and Export Button on PC */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
          {/* Halaqah Filter */}
          <div className="flex-1 min-w-0">
            {lockHalaqah ? (
              <div className="bg-white h-10 px-3.5 rounded-xl border border-emerald-950/15 shadow-2xs flex items-center gap-2 w-full">
                <span className="text-xs text-emerald-950/70 shrink-0">الحلقة:</span>
                <span className="text-xs font-bold text-emerald-900 truncate">
                  {currentHalaqahObj ? currentHalaqahObj.name : 'حلقة المعلم'}
                </span>
              </div>
            ) : (
              <div className="bg-white h-10 px-3.5 rounded-xl border border-emerald-950/15 shadow-2xs flex items-center gap-2 w-full focus-within:ring-2 focus-within:ring-emerald-600 focus-within:border-emerald-600 transition-all">
                <Filter className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="text-xs text-emerald-950/70 shrink-0 font-medium">الحلقة:</span>
                <select
                  id="attendance-halaqah-filter"
                  value={selectedHalaqahId}
                  onChange={e => setSelectedHalaqahId(e.target.value)}
                  className="text-xs font-semibold text-emerald-950 bg-transparent focus:outline-hidden w-full truncate cursor-pointer"
                >
                  <option value="all">جميع الحلقات ({formatNumberEn(halaqat.length)})</option>
                  {halaqat.map(h => (
                    <option key={h.id} value={h.id}>
                      {h.name} {h.teacherName ? `(المعلم: ${h.teacherName})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Search bar - Exactly same size */}
          <div className="flex-1 min-w-0">
            <div className="bg-white h-10 px-3.5 rounded-xl border border-emerald-950/15 shadow-2xs flex items-center gap-2 w-full focus-within:ring-2 focus-within:ring-emerald-600 focus-within:border-emerald-600 transition-all">
              <Search className="w-4 h-4 text-emerald-700 shrink-0" />
              <input
                type="text"
                placeholder="بحث باسم الطالب..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="text-xs font-medium text-emerald-950 bg-transparent focus:outline-hidden w-full placeholder:text-stone-400"
              />
            </div>
          </div>

          {/* Export Button: Beside search input on PC (hidden for teachers) */}
          {(!hideExport && !lockHalaqah) && (
            <button
              type="button"
              onClick={handleExportCurrentAttendance}
              className="hidden sm:inline-flex h-10 px-4 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs border border-stone-300 rounded-xl shadow-2xs transition-all items-center justify-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
              title="تصدير سجل التحضير إلى Google Docs أو Google Sheets"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>تصدير التحضير ({formatNumberEn(filteredStudents.length)})</span>
            </button>
          )}
        </div>

        {/* Mobile-Only Export Button (Above the stats when on mobile, hidden for teachers) */}
        {(!hideExport && !lockHalaqah) && (
          <div className="block sm:hidden w-full">
            <button
              type="button"
              onClick={handleExportCurrentAttendance}
              className="w-full h-10 px-4 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs border border-stone-300 rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              title="تصدير سجل التحضير إلى Google Docs أو Google Sheets"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>تصدير التحضير ({formatNumberEn(filteredStudents.length)})</span>
            </button>
          </div>
        )}

        {/* Quick Stats Chips: Perfectly fits the middle on mobile and PC without truncation */}
        <div className="w-full">
          <div className="grid grid-cols-4 gap-1 sm:gap-2.5 w-full">
            <div className="bg-emerald-100/80 text-emerald-900 py-1.5 px-0.5 sm:px-2 rounded-xl font-bold flex items-center justify-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs border border-emerald-200/60 shadow-2xs whitespace-nowrap">
              <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-700 shrink-0" />
              <span>حاضر:</span>
              <span className="font-black">{formatNumberEn(presentCount)}</span>
            </div>
            <div className="bg-amber-100/80 text-amber-900 py-1.5 px-0.5 sm:px-2 rounded-xl font-bold flex items-center justify-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs border border-amber-200/60 shadow-2xs whitespace-nowrap">
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-700 shrink-0" />
              <span>متأخر:</span>
              <span className="font-black">{formatNumberEn(lateCount)}</span>
            </div>
            <div className="bg-blue-100/80 text-blue-900 py-1.5 px-0.5 sm:px-2 rounded-xl font-bold flex items-center justify-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs border border-blue-200/60 shadow-2xs whitespace-nowrap">
              <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-700 shrink-0" />
              <span>مستأذن:</span>
              <span className="font-black">{formatNumberEn(excusedCount)}</span>
            </div>
            <div className="bg-rose-100/80 text-rose-900 py-1.5 px-0.5 sm:px-2 rounded-xl font-bold flex items-center justify-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs border border-rose-200/60 shadow-2xs whitespace-nowrap">
              <XCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-700 shrink-0" />
              <span>غائب:</span>
              <span className="font-black">{formatNumberEn(absentCount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {saveSuccess && (
        <div className="p-3 bg-emerald-600 text-white text-xs font-bold text-center flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          تم حفظ وتثبيت سجل تحضير الطلاب لتاريخ ({formatDateEn(selectedDate)}) بنجاح!
        </div>
      )}

      {/* Student List */}
      <div className="p-4 sm:p-6 divide-y divide-emerald-950/5">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-10 text-emerald-950/50 text-sm">
            لا يوجد طلاب في الحلقة أو البحث المحدد.
          </div>
        ) : (
          filteredStudents.map((student, idx) => {
            const currentStatus: AttendanceStatus =
              attendanceMap[student.id]?.status || 'present';
            const notes = attendanceMap[student.id]?.notes || '';
            const recordTime = attendanceMap[student.id]?.createdAt;

            return (
              <div
                key={student.id}
                id={`student-attendance-row-${student.id}`}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-emerald-50/40 rounded-xl px-2 transition-colors"
              >
                {/* Student Info: Full width on mobile showing student name clearly */}
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 w-full sm:w-auto sm:flex-1">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold flex items-center justify-center shrink-0">
                    {formatNumberEn(idx + 1)}
                  </span>
                  <div
                    onClick={() => onSelectStudent && onSelectStudent(student)}
                    className={`min-w-0 flex-1 ${onSelectStudent ? 'cursor-pointer group select-none' : ''}`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h4 className={`font-bold text-xs sm:text-sm text-emerald-950 truncate ${onSelectStudent ? 'group-hover:text-emerald-700 transition-colors underline decoration-dotted decoration-emerald-400 underline-offset-2' : ''}`}>
                        {student.fullName}
                      </h4>
                      {onSelectStudent && (
                        <span className="hidden sm:inline-block text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-md font-semibold opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          عرض الملف
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-emerald-950/60 truncate mt-0.5">
                      <span className="truncate">{student.halaqahName || 'حلقة غير محددة'}</span>
                      {recordTime && (
                        <span className="text-[10px] text-stone-400 tabular-nums shrink-0">
                          • وقت الرصد: {formatTimeEn(recordTime)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Read-Only Status Display (Admin Mode) */}
                {readOnly ? (
                  <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
                    {notes && (
                      <span className="text-xs text-stone-600 bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200 max-w-xs truncate" title={notes}>
                        ملاحظة المعلم: {notes}
                      </span>
                    )}

                    <div className="flex items-center shrink-0">
                      {currentStatus === 'present' && (
                        <span className="px-2.5 sm:px-3 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1 whitespace-nowrap">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          حاضر
                        </span>
                      )}
                      {currentStatus === 'late' && (
                        <span className="px-2.5 sm:px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1 whitespace-nowrap">
                          <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          متأخر
                        </span>
                      )}
                      {currentStatus === 'excused' && (
                        <span className="px-2.5 sm:px-3 py-1 bg-blue-100 text-blue-900 border border-blue-300 rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1 whitespace-nowrap">
                          <AlertCircle className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                          مستأذن
                        </span>
                      )}
                      {currentStatus === 'absent' && (
                        <span className="px-2.5 sm:px-3 py-1 bg-rose-100 text-rose-900 border border-rose-300 rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1 whitespace-nowrap">
                          <XCircle className="w-3.5 h-3.5 text-rose-700 shrink-0" />
                          غائب
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Interactive Status Selector - On mobile: UNDER the student name, spanning full width grid! */
                  <div className="w-full sm:w-auto flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 shrink-0">
                    <div className="grid grid-cols-4 sm:flex sm:items-center gap-1.5 sm:gap-1.5 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => handleStatusChange(student.id, 'present')}
                        className={`h-9 sm:h-auto px-1 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          currentStatus === 'present'
                            ? 'bg-emerald-700 text-white shadow-xs ring-1 ring-emerald-800'
                            : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>حاضر</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStatusChange(student.id, 'late')}
                        className={`h-9 sm:h-auto px-1 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          currentStatus === 'late'
                            ? 'bg-amber-600 text-white shadow-xs ring-1 ring-amber-700'
                            : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>متأخر</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStatusChange(student.id, 'excused')}
                        className={`h-9 sm:h-auto px-1 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          currentStatus === 'excused'
                            ? 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-700'
                            : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                        }`}
                      >
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>مستأذن</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStatusChange(student.id, 'absent')}
                        className={`h-9 sm:h-auto px-1 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          currentStatus === 'absent'
                            ? 'bg-rose-600 text-white shadow-xs ring-1 ring-rose-700'
                            : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>غائب</span>
                      </button>
                    </div>

                    {/* Notes input */}
                    <input
                      type="text"
                      placeholder="ملاحظات..."
                      value={notes}
                      onChange={e => handleNotesChange(student.id, e.target.value)}
                      className="hidden sm:inline-block text-xs px-2.5 py-1.5 rounded-xl border border-emerald-950/15 focus:outline-hidden focus:border-emerald-700 bg-white text-emerald-950 w-28 md:w-36 shrink-0"
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Action for Teacher */}
      {!readOnly && (
        <div className="p-3.5 sm:p-4 bg-emerald-50/40 border-t border-emerald-950/10">
          <button
            id="btn-save-attendance-bottom"
            type="button"
            onClick={handleSaveAttendance}
            className="w-full py-3 px-5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Save className="w-4 h-4 text-amber-400" />
            <span>حفظ وتثبيت التحضير</span>
          </button>
        </div>
      )}
      {/* Export Format Selection Modal */}
      <ExportModal
        isOpen={exportModalConfig.isOpen}
        onClose={() => setExportModalConfig(prev => ({ ...prev, isOpen: false }))}
        exportType="attendance"
        attendanceRecords={exportModalConfig.records}
        className={exportModalConfig.className}
        date={exportModalConfig.date}
      />
    </div>
  );
};
