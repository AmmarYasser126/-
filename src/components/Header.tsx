import React from 'react';
import { Role, Student, TeacherProfile, ParentProfile } from '../types';
import {
  BookOpen,
  User,
  GraduationCap,
  Shield,
  LogOut,
  Users,
} from 'lucide-react';
import { LiveDateBadge } from './LiveDateBadge';

interface HeaderProps {
  currentRole: Role;
  activeStudent: Student | null;
  activeTeacher: TeacherProfile | null;
  activeParent?: ParentProfile | null;
  activeParentPhone?: string | null;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  activeStudent,
  activeTeacher,
  activeParent,
  activeParentPhone,
  onLogout,
}) => {
  const getRoleBadge = () => {
    switch (currentRole) {
      case 'student':
        return {
          label: 'بوابة الطالب',
          icon: <User className="w-3.5 h-3.5" />,
          color: 'bg-emerald-800 text-emerald-200 border-emerald-700',
        };
      case 'teacher':
        return {
          label: 'بوابة المعلم',
          icon: <GraduationCap className="w-3.5 h-3.5" />,
          color: 'bg-teal-800 text-teal-200 border-teal-700',
        };
      case 'parent':
        return {
          label: 'بوابة ولي الأمر',
          icon: <Users className="w-3.5 h-3.5" />,
          color: 'bg-emerald-900 text-amber-300 border-emerald-700',
        };
      case 'admin':
        return {
          label: 'الإدارة والمشرف',
          icon: <Shield className="w-3.5 h-3.5" />,
          color: 'bg-amber-800 text-amber-200 border-amber-700',
        };
    }
  };

  const badge = getRoleBadge();

  return (
    <header className="bg-stone-900 border-b border-stone-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-emerald-800/80 border border-emerald-600 flex items-center justify-center text-emerald-300 shadow-inner shrink-0">
            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg md:text-xl font-black tracking-tight text-white truncate">جامع الوالدين</h1>
              <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold hidden sm:inline-block">
                نظام التحفيظ
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-300 font-semibold truncate">
              حلقات القرآن والمراجعة
            </p>
          </div>
        </div>

        {/* Live Date & Hijri Display (Desktop) */}
        <div className="hidden lg:flex items-center">
          <LiveDateBadge />
        </div>

        {/* User Session Info & Logout */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">

          {/* User Name Chip / Role Label */}
          <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl bg-stone-800 border border-stone-700 text-stone-200 text-xs font-bold">
            <span>
              {currentRole === 'student' && 'الطالب'}
              {currentRole === 'teacher' && 'المعلم'}
              {currentRole === 'parent' && (activeParent?.name ? `أ/ ${activeParent.name}` : activeParentPhone ? `ولي الأمر (${activeParentPhone})` : 'ولي الأمر')}
              {currentRole === 'admin' && 'المشرف العام'}
            </span>
          </div>

          {/* Switch Role / Logout */}
          <button
            onClick={onLogout}
            title="تبديل الحساب أو تسجيل الخروج"
            className="p-1.5 sm:p-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">تبديل الحساب</span>
          </button>
        </div>
      </div>

      {/* Mobile Sub-bar for Live Date & Hijri Display */}
      <div className="lg:hidden bg-stone-950/80 border-t border-stone-800/80 px-2.5 sm:px-4 py-1.5 flex items-center justify-between w-full overflow-hidden">
        <LiveDateBadge className="w-full" />
      </div>
    </header>
  );
};
