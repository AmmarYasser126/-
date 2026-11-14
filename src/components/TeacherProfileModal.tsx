import React, { useState } from 'react';
import { TeacherProfile, Student } from '../types';
import { getStudents, getLogs, calculateStudentStats, calculateCompletedSurahs, TEACHER_GLOBAL_PASSWORD } from '../utils/storage';
import { formatNumberEn, formatDateEn } from '../utils/format';
import { SessionStarsBadge } from './SessionStarsBadge';
import {
  X,
  GraduationCap,
  Phone,
  Mail,
  KeyRound,
  School,
  Users,
  BookOpen,
  Award,
  Calendar,
  CheckCircle2,
  Eye,
  Copy,
  Check,
  Sparkles,
  BookmarkCheck,
  FileSpreadsheet,
} from 'lucide-react';

interface TeacherProfileModalProps {
  teacher: TeacherProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onEditTeacher?: (teacher: TeacherProfile) => void;
  onSelectStudent?: (student: Student) => void;
  onOpenHalaqah?: (halaqahName: string) => void;
  onExport?: () => void;
}

export const TeacherProfileModal: React.FC<TeacherProfileModalProps> = ({
  teacher,
  isOpen,
  onClose,
  onEditTeacher,
  onSelectStudent,
  onOpenHalaqah,
  onExport,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'logs'>('overview');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen || !teacher) return null;

  // Load associated students
  const allStudents = getStudents();
  const teacherStudents = allStudents.filter(
    (s) =>
      s.halaqahId === teacher.halaqahId ||
      s.halaqahName === teacher.halaqahName ||
      (teacher.halaqahName && s.halaqahName?.trim().toLowerCase() === teacher.halaqahName.trim().toLowerCase())
  );

  // Load logs associated with this teacher's students
  const allLogs = getLogs();
  const teacherLogs = allLogs.filter((l) =>
    teacherStudents.some((s) => s.id === l.studentId)
  );

  // Calculate cumulative stats
  const totalMemorizedAyahs = teacherStudents.reduce(
    (sum, s) => sum + calculateStudentStats(s.id).totalMemorizedAyahs,
    0
  );
  const totalReviewedAyahs = teacherStudents.reduce(
    (sum, s) => sum + calculateStudentStats(s.id).totalReviewedAyahs,
    0
  );
  const totalCompletedSurahsCount = teacherStudents.reduce(
    (sum, s) => sum + calculateCompletedSurahs(s.id).completedCount,
    0
  );

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-stone-950/80 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div
        id="teacher-profile-modal"
        className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] my-auto flex flex-col shadow-2xl border border-stone-200 overflow-hidden text-right"
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-l from-emerald-900 via-emerald-950 to-stone-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0 pl-12 sm:pl-14">
          {/* Top Left Close / Cancel Button */}
          <button
            onClick={onClose}
            className="absolute top-3 left-3 sm:top-5 sm:left-5 z-20 p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-stone-200 hover:text-white transition-all cursor-pointer shadow-xs"
            aria-label="إغلاق"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
                معلم معتمد
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-amber-300 flex items-center gap-2 pt-0.5">
              <span>{teacher.name}</span>
            </h2>

            {/* Teacher's Class Under the Name (Only the class name, without "الحلقة:" prefix) */}
            <div className="flex items-center gap-1.5 text-xs text-emerald-100/90 pt-0.5">
              <School className="w-4 h-4 text-emerald-400 shrink-0" />
              <strong className="text-white font-bold">{teacher.halaqahName || 'غير محدد'}</strong>
            </div>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-stone-200 px-5 sm:px-6 bg-stone-50 shrink-0">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`py-3.5 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'overview'
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>بيانات المعلم</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('logs')}
              className={`py-3.5 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'logs'
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>سجل التسميع ({formatNumberEn(teacherLogs.length)})</span>
            </button>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: Overview & Credentials */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Performance Cards Row (5 Cards) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                  <div className="flex items-center justify-between text-xs text-emerald-800 font-bold">
                    <span>طلاب الحلقة</span>
                    <Users className="w-4 h-4 text-emerald-700" />
                  </div>
                  <div className="text-2xl font-black text-emerald-950">
                    {formatNumberEn(teacherStudents.length)}
                  </div>
                  <div className="text-[11px] text-emerald-700">طالب مقيد بالحلقة</div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
                  <div className="flex items-center justify-between text-xs text-amber-800 font-bold">
                    <span>جلسات التسميع</span>
                    <BookOpen className="w-4 h-4 text-amber-700" />
                  </div>
                  <div className="text-2xl font-black text-amber-950">
                    {formatNumberEn(teacherLogs.length)}
                  </div>
                  <div className="text-[11px] text-amber-700">جلسة مسجلة ومعتمدة</div>
                </div>

                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
                  <div className="flex items-center justify-between text-xs text-stone-700 font-bold">
                    <span>آيات الحفظ المنجزة</span>
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-stone-900">
                    {formatNumberEn(totalMemorizedAyahs)}
                  </div>
                  <div className="text-[11px] text-stone-500">آية لجميع الطلاب</div>
                </div>

                <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 space-y-1">
                  <div className="flex items-center justify-between text-xs text-teal-800 font-bold">
                    <span>آيات المراجعة</span>
                    <Award className="w-4 h-4 text-teal-700" />
                  </div>
                  <div className="text-2xl font-black text-teal-950">
                    {formatNumberEn(totalReviewedAyahs)}
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

              {/* Teacher Official Account & Credentials Details */}
              <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200 space-y-4">
                <h4 className="text-xs font-bold text-stone-900 flex items-center gap-2 border-b border-stone-200 pb-2">
                  <KeyRound className="w-4 h-4 text-amber-700" />
                  <span>بيانات الدخول والحساب الرسمي</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Full Name */}
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-stone-200">
                    <span className="text-stone-500 font-medium">الاسم الكامل:</span>
                    <span className="font-bold text-stone-900">{teacher.name}</span>
                  </div>

                  {/* Phone Number */}
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-stone-200">
                    <span className="text-stone-500 font-medium">رقم الجوال:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900 tabular-nums" dir="ltr">
                        {teacher.phoneNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(teacher.phoneNumber, 'phone')}
                        className="p-1 text-stone-400 hover:text-emerald-700 transition-colors"
                        title="نسخ رقم الجوال"
                      >
                        {copiedField === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Password PIN */}
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-stone-200">
                    <span className="text-stone-500 font-medium">كلمة المرور الموحدة:</span>
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums font-bold text-stone-900 px-2 py-0.5 rounded bg-amber-50 border border-amber-200">
                        {showPassword ? (teacher.passwordPin || TEACHER_GLOBAL_PASSWORD) : '••••••••'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1 text-stone-400 hover:text-stone-700 transition-colors"
                        title={showPassword ? 'إخفاء' : 'إظهار'}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(teacher.passwordPin || TEACHER_GLOBAL_PASSWORD, 'pin')}
                        className="p-1 text-stone-400 hover:text-emerald-700 transition-colors"
                        title="نسخ كلمة المرور"
                      >
                        {copiedField === 'pin' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-stone-200">
                    <span className="text-stone-500 font-medium">البريد الإلكتروني:</span>
                    <span className="font-medium text-stone-900" dir="ltr">
                      {teacher.email || 'لم يُسجل بريد إلكتروني'}
                    </span>
                  </div>

                  {/* Assigned Halaqah */}
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-stone-200 sm:col-span-2">
                    <span className="text-stone-500 font-medium">الحلقة المسندة:</span>
                    <span className="font-bold text-emerald-900">{teacher.halaqahName || 'غير محدد'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Recitation Sessions Log */}
          {activeTab === 'logs' && (
            <div className="space-y-3">
              {teacherLogs.length === 0 ? (
                <div className="p-8 text-center bg-stone-50 rounded-2xl border border-stone-200 text-stone-500 text-xs space-y-2">
                  <Award className="w-8 h-8 mx-auto text-stone-400" />
                  <p className="font-bold text-stone-700">لم يتم تسجيل أي جلسات تسميع</p>
                </div>
              ) : (
                <div className="divide-y divide-stone-100 border border-stone-200 rounded-2xl overflow-hidden bg-white">
                  {teacherLogs.slice(0, 30).map((log) => (
                    <div key={log.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-stone-50 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-bold text-stone-900">
                          <span>{log.studentName || 'طالب'}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.type === 'hifz'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {log.type === 'hifz' ? 'حفظ جديد' : 'مراجعة'}
                          </span>
                          <span className="text-stone-500 text-[11px] font-normal">
                            سورة {log.surahName} (الآيات {formatNumberEn(log.startAyah)}-{formatNumberEn(log.endAyah)})
                          </span>
                        </div>
                        {log.teacherNotes && (
                          <div className="text-[11px] text-stone-500 italic pr-2 border-r-2 border-amber-300">
                            ملاحظة: {log.teacherNotes}
                          </div>
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
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.teacherGrade === 'ممتاز'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-stone-100 text-stone-700'
                          }`}>
                            {log.teacherGrade}
                          </span>
                        )}
                        <span className="text-[11px] text-stone-400">
                          {formatDateEn(log.date)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-stone-50 border-t border-stone-200 flex items-center justify-center text-xs text-stone-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>نظام إدارة شؤون المعلمين - مجمع حلقات جامع الوالدين</span>
          </div>
        </div>
      </div>
    </div>
  );
};
