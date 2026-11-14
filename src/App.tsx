import React, { useState, useEffect } from 'react';
import { Role, Student, SessionLog, SessionType, JuzInfo, TeacherProfile, ParentProfile, AuthSession } from './types';
import {
  initializeSeedData,
  getStudents,
  getTeachers,
  getLogs,
  getAuthSession,
  setAuthSession,
} from './utils/storage';
import { Header } from './components/Header';
import { AuthPortal } from './components/AuthPortal';
import { StudentDashboard } from './components/StudentDashboard';
import { TeacherDashboard } from './components/TeacherDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { ParentDashboard } from './components/ParentDashboard';
import { LogSessionModal } from './components/LogSessionModal';
import { JuzDetailModal } from './components/JuzDetailModal';
import { BookOpen, ShieldCheck } from 'lucide-react';

export default function App() {
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [activeTeacher, setActiveTeacher] = useState<TeacherProfile | null>(null);
  const [activeParent, setActiveParent] = useState<ParentProfile | null>(null);
  const [activeParentPhone, setActiveParentPhone] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [logs, setLogs] = useState<SessionLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals state
  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false);
  const [logModalStudent, setLogModalStudent] = useState<Student | null>(null);
  const [logModalType, setLogModalType] = useState<SessionType>('hifz');
  const [selectedJuzForDetail, setSelectedJuzForDetail] = useState<JuzInfo | null>(null);

  const refreshData = () => {
    const loadedStudents = getStudents();
    setStudents(loadedStudents);

    const loadedTeachers = getTeachers();
    setTeachers(loadedTeachers);

    const loadedLogs = getLogs();
    setLogs(loadedLogs);

    // Keep active student/teacher updated if modified
    if (activeStudent) {
      const refreshedSt = loadedStudents.find((s) => s.id === activeStudent.id);
      if (refreshedSt) setActiveStudent(refreshedSt);
    }
    if (activeTeacher) {
      const refreshedT = loadedTeachers.find((t) => t.id === activeTeacher.id);
      if (refreshedT) setActiveTeacher(refreshedT);
    }
  };

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await initializeSeedData();
      refreshData();

      // Check tab-isolated saved auth session (allows multiple users in different tabs/devices simultaneously)
      const savedSession = getAuthSession();
      if (savedSession) {
        setCurrentRole(savedSession.role);
        if (savedSession.student) setActiveStudent(savedSession.student);
        if (savedSession.teacher) setActiveTeacher(savedSession.teacher);
        if (savedSession.parent) setActiveParent(savedSession.parent);
        if (savedSession.parentPhone) setActiveParentPhone(savedSession.parentPhone);
      }
      setIsLoading(false);
    }
    init();

    const handleDataUpdate = () => {
      refreshData();
    };
    window.addEventListener('tahfeeth_data_updated', handleDataUpdate);
    return () => window.removeEventListener('tahfeeth_data_updated', handleDataUpdate);
  }, []);

  const handleLoginSuccess = (
    role: Role,
    student?: Student,
    teacher?: TeacherProfile,
    rememberMe: boolean = false,
    parentPhone?: string,
    parentProfile?: ParentProfile
  ) => {
    setCurrentRole(role);
    setActiveStudent(student || null);
    setActiveTeacher(teacher || null);
    setActiveParent(parentProfile || null);
    setActiveParentPhone(parentPhone || null);

    const session: AuthSession = {
      role,
      student,
      teacher,
      parent: parentProfile,
      parentPhone,
      rememberMe: Boolean(rememberMe),
      explicitRemember: Boolean(rememberMe),
    };
    setAuthSession(session);
    refreshData();
  };

  const handleLogout = () => {
    setCurrentRole(null);
    setActiveStudent(null);
    setActiveTeacher(null);
    setActiveParent(null);
    setActiveParentPhone(null);
    setAuthSession(null);
  };

  const handleOpenLogModal = (student: Student, type: SessionType = 'hifz') => {
    // If teacher, only allow logging for students in their own halaqah
    if (currentRole === 'teacher' && activeTeacher) {
      const isMyStudent =
        student.halaqahId === activeTeacher.halaqahId ||
        student.halaqahName === activeTeacher.halaqahName;
      if (!isMyStudent) {
        return;
      }
    }
    setLogModalStudent(student);
    setLogModalType(type);
    setIsLogModalOpen(true);
  };

  const handleLogSaved = () => {
    refreshData();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-950 text-white flex items-center justify-center p-4" dir="rtl">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-800 text-emerald-300 flex items-center justify-center mx-auto animate-pulse shadow-lg border border-emerald-700">
            <BookOpen className="w-6 h-6" />
          </div>
          <h2 className="text-stone-100 font-black text-lg">جامع الوالدين — نظام التحفيظ</h2>
          <p className="text-xs text-stone-400">جاري تهيئة قاعدة البيانات والتطبيقات...</p>
        </div>
      </div>
    );
  }

  // If not logged in, show Auth Portal (4 Options: Student, Teacher, Admin, Parent)
  if (!currentRole) {
    return <AuthPortal onLoginSuccess={handleLoginSuccess} />;
  }

  const currentStudentLogs = activeStudent ? logs.filter((l) => l.studentId === activeStudent.id) : [];

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 flex flex-col antialiased selection:bg-emerald-100" dir="rtl">
      {/* App Top Bar */}
      <Header
        currentRole={currentRole}
        activeStudent={activeStudent}
        activeTeacher={activeTeacher}
        activeParent={activeParent}
        activeParentPhone={activeParentPhone}
        onLogout={handleLogout}
      />

      {/* Main App Content View */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-2.5 sm:px-4 py-4 sm:py-6">
        {/* 1. Student Dashboard View (Read-Only) */}
        {currentRole === 'student' && activeStudent && (
          <StudentDashboard
            student={activeStudent}
            logs={currentStudentLogs}
            onSelectJuzDetail={setSelectedJuzForDetail}
          />
        )}

        {/* 2. Teacher Dashboard View */}
        {currentRole === 'teacher' && activeTeacher && (
          <TeacherDashboard
            teacher={activeTeacher}
            students={students}
            allLogs={logs}
            onOpenLogModal={handleOpenLogModal}
            onRefresh={refreshData}
          />
        )}

        {/* 3. Admin Dashboard View */}
        {currentRole === 'admin' && (
          <AdminDashboard
            students={students}
            allLogs={logs}
            onOpenLogModal={handleOpenLogModal}
            onRefresh={refreshData}
          />
        )}

        {/* 4. Parent Dashboard View */}
        {currentRole === 'parent' && (
          <ParentDashboard
            parentPhone={activeParentPhone || (activeParent?.phoneNumber || '')}
            parentName={activeParent?.name}
            studentsList={students}
            allLogs={logs}
            onSelectJuzDetail={setSelectedJuzForDetail}
          />
        )}
      </main>

      {/* App Footer */}
      <footer className="bg-stone-900 text-stone-400 border-t border-stone-800 py-5 px-4 text-center text-xs space-y-2">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">جامع الوالدين</span>
            <span>•</span>
            <span>نظام متابعة وتوثيق حلقات تحفيظ القرآن الكريم</span>
          </div>

          <div className="flex items-center gap-1.5 text-stone-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>نظام إلكتروني آمن ومحمي</span>
          </div>
        </div>

        {/* Developer Credit */}
        <div className="pt-2 border-t border-stone-800/80 max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 text-[11px] text-stone-400 font-medium">
          <span>المطور: <strong className="text-amber-400 font-bold">عمار ياسر عسيري</strong></span>
          <span className="hidden sm:inline">•</span>
          <span dir="ltr">Developer: <strong className="text-amber-400 font-bold">Ammar Yasser Asiry</strong></span>
        </div>
      </footer>

      {/* Teacher / Admin Log Session Modal */}
      {logModalStudent && (
        <LogSessionModal
          isOpen={isLogModalOpen}
          onClose={() => setIsLogModalOpen(false)}
          student={logModalStudent}
          studentsList={
            currentRole === 'teacher' && activeTeacher
              ? students.filter(
                  (st) =>
                    st.halaqahId === activeTeacher.halaqahId ||
                    st.halaqahName === activeTeacher.halaqahName
                )
              : students
          }
          onLogSaved={handleLogSaved}
          defaultType={logModalType}
          isTeacher={currentRole === 'teacher'}
        />
      )}

      {/* 30 Ajza Detail Modal */}
      <JuzDetailModal
        isOpen={Boolean(selectedJuzForDetail)}
        onClose={() => setSelectedJuzForDetail(null)}
        juz={selectedJuzForDetail}
        logs={currentStudentLogs}
        student={activeStudent}
        currentRole={currentRole || 'student'}
        juzColor={
          selectedJuzForDetail && activeStudent
            ? activeStudent.juzColors?.[selectedJuzForDetail.juzNumber]
            : undefined
        }
      />
    </div>
  );
}
