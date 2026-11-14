import React, { useState } from 'react';
import { Student, SessionLog, JuzInfo } from '../types';
import { getStudentsByParentPhone } from '../utils/storage';
import { StudentDashboard } from './StudentDashboard';
import {
  BookOpen,
  AlertCircle,
  Users,
  ChevronLeft,
  Phone,
} from 'lucide-react';

interface ParentDashboardProps {
  parentPhone: string;
  parentName?: string;
  studentsList: Student[];
  allLogs: SessionLog[];
  onSelectJuzDetail?: (juz: JuzInfo) => void;
}

export const ParentDashboard: React.FC<ParentDashboardProps> = ({
  parentPhone,
  parentName,
  studentsList,
  allLogs,
  onSelectJuzDetail = () => {},
}) => {
  // Find all children linked to this parent phone number
  const linkedChildren = getStudentsByParentPhone(parentPhone);

  // Selected student to view
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const selectedStudent = linkedChildren.find((s) => s.id === selectedStudentId);

  // 1. If a student is selected: render the EXACT student dashboard without chat
  if (selectedStudent) {
    const studentLogs = allLogs.filter((l) => l.studentId === selectedStudent.id);
    return (
      <div className="animate-in fade-in duration-200" dir="rtl">
        {/* Student View (Everything the student sees EXCEPT chat) */}
        <StudentDashboard
          student={selectedStudent}
          logs={studentLogs}
          onSelectJuzDetail={onSelectJuzDetail}
          hideChat={true}
          onBackToChildrenList={() => setSelectedStudentId(null)}
        />
      </div>
    );
  }

  // 2. Initial Screen: Show all children linked to this phone number "under each other"
  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200" dir="rtl">
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-emerald-950 to-stone-900 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-xl border border-stone-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-800/80 text-emerald-200 text-xs font-bold border border-emerald-700">
              <Users className="w-3.5 h-3.5 text-amber-300" />
              <span>بوابة أولياء الأمور</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black text-white">
              {parentName ? `أ/ ${parentName}` : 'ولي الأمر الكريم'}
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 flex items-center gap-2 pt-0.5">
              <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span dir="ltr" className="font-bold text-amber-300 tabular-nums">{parentPhone}</span>
            </p>
          </div>

          <div className="bg-white/10 border border-white/15 px-4 py-2.5 rounded-2xl text-center self-stretch sm:self-auto shrink-0">
            <span className="text-[11px] text-emerald-200 block">الأبناء المسجلون</span>
            <span className="text-xl font-black text-white">{linkedChildren.length}</span>
          </div>
        </div>
      </div>

      {/* Children List: Under each other */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 border-b border-stone-200 pb-2">
          <div>
            <h2 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-700" />
              <span>قائمة الأبناء ({linkedChildren.length})</span>
            </h2>
          </div>
        </div>

        {linkedChildren.length === 0 ? (
          <div className="bg-white rounded-3xl border border-stone-200 shadow-xs p-8 sm:p-12 text-center max-w-xl mx-auto space-y-4">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto border border-amber-200 shadow-inner">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-black text-stone-900">
                لم يتم العثور على طلاب مسجلين برقم الجوال ({parentPhone})
              </h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
                يرجى التأكد من تطابق رقم الجوال مع رقم ولي الأمر المسجل في بطاقة الطالب من قِبل إدارة المسجد أو معلم الحلقة.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {linkedChildren.map((child, index) => {
              return (
                <div
                  key={child.id}
                  onClick={() => setSelectedStudentId(child.id)}
                  className="bg-white hover:bg-emerald-50/40 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border-2 border-stone-200 hover:border-emerald-500 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group"
                >
                  {/* Left (RTL Right): Student Identity */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-100 text-emerald-800 font-black text-base sm:text-lg flex items-center justify-center border border-emerald-300 shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                      {index + 1}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base sm:text-lg font-black text-stone-900 group-hover:text-emerald-800 transition-colors truncate">
                          {child.fullName}
                        </h3>
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {child.halaqahName || 'حلقة عامة'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right (RTL Left): Action */}
                  <div className="flex items-center justify-end gap-1 text-xs font-bold text-emerald-700 group-hover:translate-x-[-3px] transition-transform shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-stone-100">
                    <span>عرض الإنجاز</span>
                    <ChevronLeft className="w-4 h-4 text-emerald-700" />
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
