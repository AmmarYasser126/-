import React, { useState, useEffect } from 'react';
import { Student, SessionLog, TeacherGrade, TeacherProfile, SessionType } from '../types';
import {
  saveLog,
  calculateStudentStats,
  getUnreadMessagesCount,
  getUnreadCountPerStudent,
  isRecitationDayToday,
  getRecitationDaysNames,
  clearTeacherClassLogs,
} from '../utils/storage';
import { LeaderboardView } from './LeaderboardView';
import { AttendanceManager } from './AttendanceManager';
import { StudentProfileModal } from './StudentProfileModal';
import { SessionStarsBadge } from './SessionStarsBadge';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { ChatBox } from './ChatBox';
import { ChatModal } from './ChatModal';
import { formatDateEn, formatNumberEn, formatSessionHifzText, formatSessionMurajaahText } from '../utils/format';
import { searchAndRankArabic } from '../utils/arabicSearch';
import {
  GraduationCap,
  CheckCircle2,
  Award,
  BookOpen,
  RotateCcw,
  Calendar,
  Users,
  Search,
  MessageSquare,
  FileCheck,
  Send,
  PlusCircle,
  Trophy,
  Filter,
  UserCheck,
  Layers,
  Eye,
  FileSpreadsheet,
  Download,
  Star,
  Trash2,
  MessageCircle,
} from 'lucide-react';

interface TeacherDashboardProps {
  teacher: TeacherProfile;
  students: Student[];
  allLogs: SessionLog[];
  onOpenLogModal: (student: Student, type?: SessionType) => void;
  onRefresh: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  teacher,
  students,
  allLogs,
  onOpenLogModal,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'sessions' | 'students' | 'attendance' | 'leaderboard' | 'chat'>('sessions');
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'combined' | 'hifz' | 'murajaah'>('all');
  const [searchStudentQuery, setSearchStudentQuery] = useState<string>('');
  const [isClearTeacherLogsOpen, setIsClearTeacherLogsOpen] = useState(false);
  const [isDeletingLogs, setIsDeletingLogs] = useState(false);
  
  // Student detail modal state
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);

  // Chat modal state
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatTargetStudentId, setChatTargetStudentId] = useState<string | null>(null);
  const [totalUnreadChatCount, setTotalUnreadChatCount] = useState<number>(() =>
    getUnreadMessagesCount(teacher.id, 'teacher')
  );
  const [unreadCountsPerStudent, setUnreadCountsPerStudent] = useState<Record<string, number>>(() =>
    getUnreadCountPerStudent(teacher.id)
  );

  const isAllowedRecitationToday = isRecitationDayToday();

  useEffect(() => {
    const handleUpdate = () => {
      setTotalUnreadChatCount(getUnreadMessagesCount(teacher.id, 'teacher'));
      setUnreadCountsPerStudent(getUnreadCountPerStudent(teacher.id));
    };
    window.addEventListener('tahfeeth_data_updated', handleUpdate);
    const interval = setInterval(handleUpdate, 4000);
    return () => {
      window.removeEventListener('tahfeeth_data_updated', handleUpdate);
      clearInterval(interval);
    };
  }, [teacher.id]);

  // STRICT ACCESS CONTROL: Only students belonging to this teacher's class
  const classStudents = students.filter(
    (st) => st.halaqahId === teacher.halaqahId || st.halaqahName === teacher.halaqahName
  );
  const classStudentIds = new Set(classStudents.map((s) => s.id));

  // Only logs belonging to students in this teacher's class, excluding logs hidden for teacher view
  const classLogs = allLogs.filter((l) => classStudentIds.has(l.studentId) && !l.hiddenForTeacher);

  // Cumulative total sessions ever recorded for this class (auto-deletes and resets when it reaches 99)
  const allClassLogsCount = allLogs.filter((l) => classStudentIds.has(l.studentId)).length;
  const storageKey = `teacher_recorded_sessions_${teacher.id}`;
  const savedCumulative = parseInt(localStorage.getItem(storageKey) || '0', 10);
  let totalRecordedSessions = Math.max(savedCumulative, allClassLogsCount);
  if (totalRecordedSessions >= 99 || classLogs.length >= 99) {
    clearTeacherClassLogs(teacher.halaqahId, teacher.halaqahName, teacher.id);
    totalRecordedSessions = 0;
    try {
      localStorage.setItem(storageKey, '0');
    } catch (e) {
      console.error(e);
    }
  } else if (totalRecordedSessions > savedCumulative) {
    localStorage.setItem(storageKey, totalRecordedSessions.toString());
  }

  const filteredLogs = classLogs.filter((l) => {
    if (selectedStudentFilter !== 'all' && l.studentId !== selectedStudentFilter) return false;
    if (selectedTypeFilter !== 'all' && l.type !== selectedTypeFilter) return false;
    return true;
  });

  const filteredStudents = searchAndRankArabic<Student>(
    classStudents,
    searchStudentQuery,
    (st: Student) => st.fullName,
    (st: Student) => [st.rawPhoneNumber, st.email]
  );

  const handleConfirmClearClassLogs = async () => {
    setIsDeletingLogs(true);
    try {
      await clearTeacherClassLogs(teacher.halaqahId, teacher.halaqahName, teacher.id);
      setIsClearTeacherLogsOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Error clearing class logs:', err);
    } finally {
      setIsDeletingLogs(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Teacher Top Banner */}
      <div className="bg-linear-to-r from-stone-900 via-emerald-950 to-stone-900 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-xl border border-stone-800">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs text-amber-300 font-semibold">{teacher.halaqahName}</span>
            <h2 className="text-2xl sm:text-3xl font-black">{teacher.name}</h2>
          </div>

          <div className="flex items-center justify-around sm:justify-start gap-3 bg-stone-900/80 border border-stone-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl w-full sm:w-auto">
            <div className="text-center">
              <div className="text-2xl font-black text-amber-300">{classStudents.length}</div>
              <div className="text-[10px] text-stone-400">طلاب الحلقة</div>
            </div>
            <div className="w-px h-8 bg-stone-700" />
            <div className="text-center">
              <div className="text-2xl font-black text-white">{totalRecordedSessions}</div>
              <div className="text-[10px] text-stone-400">سجل التسميع</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-stone-200/80 rounded-2xl max-w-2xl mx-auto overflow-x-auto no-scrollbar scrollbar-none touch-pan-x">
        <button
          onClick={() => setActiveTab('sessions')}
          className={`flex-1 shrink-0 min-w-fit py-2 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'sessions'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          سجل التسميع ({classLogs.length})
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex-1 shrink-0 min-w-fit py-2 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'attendance'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          <span>تحضير الطلاب</span>
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`flex-1 shrink-0 min-w-fit py-2 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'students'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          طلاب الحلقة ({classStudents.length})
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 shrink-0 min-w-fit py-2 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'chat'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          <span>محادثات الطلاب</span>
          {totalUnreadChatCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-amber-400 text-amber-950 font-black text-[10px] flex items-center justify-center animate-pulse shrink-0">
              {totalUnreadChatCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex-1 shrink-0 min-w-fit py-2 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'leaderboard'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          لوحة الشرف
        </button>
      </div>

      {/* Tab: Attendance Roll-Call (Locked to this teacher's class) */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <AttendanceManager
            initialHalaqahId={teacher.halaqahId}
            teacherHalaqahName={teacher.halaqahName}
            lockHalaqah={true}
            hideExport={true}
            teacherName={teacher.name}
            onAttendanceUpdated={onRefresh}
            onSelectStudent={(st) => setSelectedStudentForProfile(st)}
          />
        </div>
      )}

      {/* Tab: Leaderboard */}
      {activeTab === 'leaderboard' && <LeaderboardView />}

      {/* Tab: Students Directory with Direct Log Action & Profile Viewer */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <input
                type="text"
                value={searchStudentQuery}
                onChange={(e) => setSearchStudentQuery(e.target.value)}
                placeholder="بحث باسم الطالب..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-stone-300 text-xs text-stone-900 bg-stone-50 focus:bg-white"
              />
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-3" />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-600 bg-stone-100 px-3 py-2 rounded-xl">
                إجمالي طلاب الحلقة: {formatNumberEn(filteredStudents.length)}
              </span>
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-stone-800 text-sm">لا يوجد طلاب مسجلون في هذه الحلقة حالياً</h4>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                يمكن إضافة الطلاب إلى حلقة ({teacher.halaqahName}) عن طريق الإدارة، أو تسجيل الطالب ذاتياً باختيار هذه الحلقة عند التسجيل.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs divide-y divide-stone-100">
              {filteredStudents.map((st) => {
                const stats = calculateStudentStats(st.id);

                return (
                  <div
                    key={st.id}
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-stone-50 transition-colors"
                  >
                    <div
                      onClick={() => setSelectedStudentForProfile(st)}
                      className="space-y-1.5 cursor-pointer group flex-1"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-stone-900 text-sm group-hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                          <span>{st.fullName}</span>
                          <Eye className="w-3.5 h-3.5 text-stone-400 group-hover:text-emerald-600" />
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                          {st.halaqahName || teacher.halaqahName}
                        </span>
                      </div>

                      {/* Stars, Surahs & Attendance Metrics Badges */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 font-extrabold text-[11px]">
                          <BookOpen className="w-3 h-3 text-emerald-700" />
                          <span>{formatNumberEn(stats.completedSurahsCount)} سورة محفوظة</span>
                        </span>

                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 font-extrabold text-[11px]">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          <span>{formatNumberEn(stats.totalStars)} نجمة</span>
                        </span>

                        <span
                          title="أيام الغياب خلال الأسبوع الحالي (تتجدد تلقائياً مع بداية كل أسبوع دراسي جديد)"
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            stats.totalAbsents > 0
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-stone-100 text-stone-500 border border-stone-200'
                          }`}
                        >
                          <span>{formatNumberEn(stats.totalAbsents)} غياب (أسبوعياً)</span>
                        </span>

                        <span
                          title="أيام الحضور خلال الأسبوع الحالي (تتجدد تلقائياً مع بداية كل أسبوع دراسي جديد)"
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold"
                        >
                          <span>{formatNumberEn(stats.totalPresent)} حضور (أسبوعياً)</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap justify-start md:justify-end w-full md:w-auto">
                      <button
                        onClick={() => setSelectedStudentForProfile(st)}
                        className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 cursor-pointer transition-colors shadow-2xs flex items-center justify-center"
                        title="عرض ملف الطالب الشامل"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>



                      {/* WhatsApp Button to message parent directly */}
                      {st.rawPhoneNumber ? (
                        <a
                          href={`https://wa.me/966${st.rawPhoneNumber.replace(/\D/g, '').replace(/^0/, '')}?text=${encodeURIComponent(
                            `السلام عليكم ورحمة الله وبركاته، معكم معلم حلقة ${teacher.halaqahName} بجامع الوالدين، بخصوص الطالب ${st.fullName}.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[#25D366] hover:text-[#1ebd5b] cursor-pointer transition-colors shadow-2xs flex items-center justify-center"
                          title={`مراسلة ولي أمر الطالب ${st.fullName} عبر واتساب (${st.rawPhoneNumber})`}
                        >
                          <MessageCircle className="w-3.5 h-3.5 fill-current" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Chat System with Students */}
      {activeTab === 'chat' && (
        <div className="space-y-4">
          <ChatBox
            currentRole="teacher"
            currentTeacher={teacher}
            teacherStudents={classStudents}
            initialTargetStudentId={chatTargetStudentId || undefined}
            onSelectStudent={(stId) => setChatTargetStudentId(stId)}
          />
        </div>
      )}

      {/* Tab: Sessions List & Controls */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          {/* Filter & Action Bar: Each takes half width on desktop, stacked on mobile, perfectly aligned */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            {/* Right: Type Filter (النوع) - takes exact half width, perfectly aligned in height and boundaries */}
            <div className="flex items-center w-full h-11 rounded-xl border border-stone-300 bg-stone-50 overflow-hidden shadow-2xs focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600 focus-within:bg-white transition-all">
              <span className="px-3.5 text-xs font-bold text-stone-600 bg-stone-100/90 border-l border-stone-200 h-full flex items-center shrink-0 select-none">
                النوع:
              </span>
              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value as any)}
                className="w-full flex-1 h-full px-3 text-xs font-bold text-stone-800 bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="all">الكل (شامل)</option>
                <option value="combined">حفظ ومراجعة معاً</option>
                <option value="hifz">حفظ جديد فقط</option>
                <option value="murajaah">مراجعة فقط</option>
              </select>
            </div>

            {/* Left: Quick New Log Button (توثيق تسميع جديد) - exact half width, perfectly aligned in height and boundaries */}
            {classStudents.length > 0 && (
              <button
                type="button"
                disabled={!isAllowedRecitationToday}
                onClick={() => {
                  if (isAllowedRecitationToday) {
                    onOpenLogModal(classStudents[0], 'combined');
                  }
                }}
                className={`w-full h-11 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                  isAllowedRecitationToday
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-2xs cursor-pointer'
                    : 'bg-stone-300 text-stone-500 border border-stone-300 cursor-not-allowed shadow-none'
                }`}
                title={
                  isAllowedRecitationToday
                    ? 'توثيق تسميع جديد'
                    : `لا يمكن توثيق التسميع اليوم؛ لأن أيام التسميع المعتمدة هي: (${getRecitationDaysNames()})`
                }
              >
                <PlusCircle className={`w-4 h-4 ${isAllowedRecitationToday ? 'text-amber-300' : 'text-stone-400'}`} />
                <span>توثيق تسميع جديد</span>
              </button>
            )}
          </div>

          {/* Logs List */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 flex-wrap gap-2">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-700" />
                <span>جلسات التسميع ({filteredLogs.length})</span>
              </h3>
              {classLogs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsClearTeacherLogsOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="مسح جميع سجلات التسميع لطلاب الحلقة في زر واحد"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>مسح سجل التسميع للحلقة</span>
                </button>
              )}
            </div>

            {filteredLogs.length === 0 ? (
              <div className="text-center py-10 text-stone-400 text-xs">
                لم يتم تسجيل أي جلسات تسميع
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map((log) => {
                  const student = students.find((s) => s.id === log.studentId);
                  const isCombined = log.type === 'combined';
                  const isHifz = log.type === 'hifz';

                  return (
                    <div
                      key={log.id}
                      className="p-4 rounded-xl border border-stone-200 bg-white hover:border-emerald-300 transition-all space-y-3"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              onClick={() => student && setSelectedStudentForProfile(student)}
                              className={`font-extrabold text-stone-900 text-base ${student ? 'cursor-pointer hover:text-emerald-700 hover:underline decoration-dotted underline-offset-2' : ''}`}
                              title="عرض ملف الطالب الشامل والمنحنى البياني"
                            >
                              {log.studentName}
                            </span>

                            <span
                              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
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
                                : 'مراجعة'}
                            </span>

                            {isCombined ? (
                              <span className="font-bold text-stone-800 text-xs sm:text-sm">
                                🟢 حفظ: {formatSessionHifzText(log)} • 🔵 مراجعة: {formatSessionMurajaahText(log)}
                              </span>
                            ) : isHifz ? (
                              <span className="font-bold text-stone-800 text-sm">
                                {formatSessionHifzText(log)}
                              </span>
                            ) : (
                              <span className="font-bold text-stone-800 text-sm">
                                {formatSessionMurajaahText(log)}
                              </span>
                            )}

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
                          </div>

                          <div className="text-xs text-stone-500 flex items-center gap-3">
                            <span>التاريخ: {formatDateEn(log.date)}</span>
                            {log.teacherNotes && (
                              <span className="text-stone-600">الملاحظة: {log.teacherNotes}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Student Comprehensive Profile, Memorization Status & Growth Graph Modal */}
      <StudentProfileModal
        student={selectedStudentForProfile}
        isOpen={!!selectedStudentForProfile}
        onClose={() => setSelectedStudentForProfile(null)}
        onOpenLogModal={onOpenLogModal}
        currentRole="teacher"
      />

      {/* Direct Student Chat Modal */}
      <ChatModal
        key={chatTargetStudentId || 'teacher-chat-modal'}
        isOpen={isChatModalOpen}
        onClose={() => {
          setIsChatModalOpen(false);
          setChatTargetStudentId(null);
        }}
        currentRole="teacher"
        currentTeacher={teacher}
        teacherStudents={classStudents}
        initialTargetStudentId={chatTargetStudentId || undefined}
        onSelectStudent={(stId) => setChatTargetStudentId(stId)}
      />

      {/* Delete Confirmation Dialog for Teacher Class Logs */}
      <DeleteConfirmDialog
        isOpen={isClearTeacherLogsOpen}
        title="تأكيد مسح سجل التسميع للحلقة"
        message={`هل أنت متأكد من مسح جميع سجلات التسميع لطلاب حلقة (${teacher.halaqahName})؟ سيتم مسح كافة جلسات التسميع وتصفير السجل لهذه الحلقة في زر واحد.`}
        confirmLabel={isDeletingLogs ? 'جارٍ المسح...' : 'نعم، مسح سجل التسميع'}
        onConfirm={handleConfirmClearClassLogs}
        onClose={() => setIsClearTeacherLogsOpen(false)}
      />
    </div>
  );
};

