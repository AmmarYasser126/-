import React from 'react';
import { Student, TeacherProfile } from '../types';
import { ChatBox } from './ChatBox';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: 'student' | 'teacher';
  currentStudent?: Student | null;
  currentTeacher?: TeacherProfile | null;
  initialTargetStudentId?: string;
  teacherStudents?: Student[];
  onSelectStudent?: (studentId: string) => void;
}

export const ChatModal: React.FC<ChatModalProps> = ({
  isOpen,
  onClose,
  currentRole,
  currentStudent,
  currentTeacher,
  initialTargetStudentId,
  teacherStudents = [],
  onSelectStudent,
}) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-950/75 backdrop-blur-xs animate-in fade-in"
      dir="rtl"
    >
      <ChatBox
        key={initialTargetStudentId || 'chatbox'}
        currentRole={currentRole}
        currentStudent={currentStudent}
        currentTeacher={currentTeacher}
        initialTargetStudentId={initialTargetStudentId}
        teacherStudents={teacherStudents}
        onClose={onClose}
        isModal={true}
        onSelectStudent={onSelectStudent}
      />
    </div>
  );
};
