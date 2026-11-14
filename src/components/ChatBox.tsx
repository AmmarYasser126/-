import React, { useState, useEffect, useRef } from 'react';
import { Student, TeacherProfile, ChatMessage } from '../types';
import {
  getConversation,
  sendChatMessage,
  deleteChatMessage,
  clearConversation,
  markConversationAsRead,
  getStudentTeacher,
  getUnreadCountPerStudent,
  getStudents,
} from '../utils/storage';
import { formatTimeEn, formatDateEn } from '../utils/format';
import {
  Send,
  CheckCheck,
  User,
  X,
  GraduationCap,
  Trash2,
  AlertTriangle,
  KeyRound,
} from 'lucide-react';

export interface ChatBoxProps {
  currentRole: 'student' | 'teacher';
  currentStudent?: Student | null;
  currentTeacher?: TeacherProfile | null;
  initialTargetStudentId?: string;
  teacherStudents?: Student[];
  onClose?: () => void;
  isModal?: boolean;
  onSelectStudent?: (studentId: string) => void;
}

export const ChatBox: React.FC<ChatBoxProps> = ({
  currentRole,
  currentStudent,
  currentTeacher,
  initialTargetStudentId,
  teacherStudents = [],
  onClose,
  isModal = false,
  onSelectStudent,
}) => {
  // Initialize student id directly and reliably
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    return initialTargetStudentId || (teacherStudents[0]?.id ?? '');
  });

  // Always sync selectedStudentId when initialTargetStudentId changes from outside
  useEffect(() => {
    if (initialTargetStudentId) {
      setSelectedStudentId(initialTargetStudentId);
    }
  }, [initialTargetStudentId]);

  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Dialog state for clearing all messages with this contact
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false);
  const [clearPasscode, setClearPasscode] = useState('');
  const [clearPasscodeError, setClearPasscodeError] = useState('');

  // Ref to the internal scrollable container ONLY - avoids window/page scrolling glitch
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  let activeStudent: Student | null = null;
  let activeTeacher: TeacherProfile | null = null;

  if (currentRole === 'student' && currentStudent) {
    activeStudent = currentStudent;
    activeTeacher = getStudentTeacher(currentStudent.id);
  } else if (currentRole === 'teacher' && currentTeacher) {
    activeTeacher = currentTeacher;
    const allKnown = teacherStudents.length > 0 ? teacherStudents : getStudents();
    activeStudent =
      teacherStudents.find((s) => String(s.id).trim() === String(selectedStudentId).trim()) ||
      allKnown.find((s) => String(s.id).trim() === String(selectedStudentId).trim()) ||
      teacherStudents[0] ||
      allKnown[0] ||
      null;
  }

  const reloadConversation = () => {
    if (!activeStudent || !activeTeacher) {
      setMessages([]);
      return;
    }
    const conv = getConversation(activeStudent.id, activeTeacher.id);
    setMessages(conv);
    markConversationAsRead(activeStudent.id, activeTeacher.id, currentRole);

    if (currentRole === 'teacher' && currentTeacher) {
      setUnreadCounts(getUnreadCountPerStudent(currentTeacher.id));
    }
  };

  useEffect(() => {
    reloadConversation();

    const handleDataUpdate = () => {
      reloadConversation();
    };

    window.addEventListener('tahfeeth_data_updated', handleDataUpdate);
    const interval = setInterval(reloadConversation, 3500);

    return () => {
      window.removeEventListener('tahfeeth_data_updated', handleDataUpdate);
      clearInterval(interval);
    };
  }, [activeStudent?.id, activeTeacher?.id, currentRole]);

  // Smoothly scroll ONLY internal container on messages update (does not scroll window)
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages.length, selectedStudentId]);

  const handleSelectContact = (studentId: string) => {
    setSelectedStudentId(studentId);
    if (onSelectStudent) {
      onSelectStudent(studentId);
    }
  };

  const handleSendMessage = () => {
    const text = inputText.trim();
    if (!text || !activeStudent || !activeTeacher) return;

    if (currentRole === 'student') {
      sendChatMessage({
        senderId: activeStudent.id,
        senderName: activeStudent.fullName,
        senderRole: 'student',
        recipientId: activeTeacher.id,
        recipientName: activeTeacher.name,
        studentId: activeStudent.id,
        teacherId: activeTeacher.id,
        text,
      });
    } else {
      sendChatMessage({
        senderId: activeTeacher.id,
        senderName: activeTeacher.name,
        senderRole: 'teacher',
        recipientId: activeStudent.id,
        recipientName: activeStudent.fullName,
        studentId: activeStudent.id,
        teacherId: activeTeacher.id,
        text,
      });
    }

    setInputText('');
    reloadConversation();

    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    }, 60);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handler to clear all messages for this contact (requires A1B2C3)
  const handleConfirmClearAll = (e: React.FormEvent) => {
    e.preventDefault();
    if (clearPasscode.trim().toUpperCase() !== 'A1B2C3') {
      setClearPasscodeError('رمز التأكيد غير صحيح! يرجى إدخال الرمز: A1B2C3');
      return;
    }
    if (!activeStudent || !activeTeacher) return;

    clearConversation(activeStudent.id, activeTeacher.id);
    setIsClearAllDialogOpen(false);
    setClearPasscode('');
    setClearPasscodeError('');
    setMessages([]);
  };

  const formatMsgDatePill = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      const now = new Date();
      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();

      if (isToday) return 'اليوم';

      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const isYesterday =
        d.getDate() === yesterday.getDate() &&
        d.getMonth() === yesterday.getMonth() &&
        d.getFullYear() === yesterday.getFullYear();

      if (isYesterday) return 'أمس';

      return formatDateEn(d);
    } catch {
      return '';
    }
  };

  return (
    <div
      className={`bg-white rounded-2xl sm:rounded-3xl border border-stone-200 overflow-hidden flex flex-col shadow-lg relative ${
        isModal ? 'w-full max-w-xl h-[88vh] max-h-[680px]' : 'w-full min-h-[520px] h-[640px]'
      }`}
      dir="rtl"
    >
      {/* WhatsApp Green Top Bar with Delete All Button */}
      <div className="bg-[#008069] text-white px-3 sm:px-4 py-3 flex items-center justify-between shadow-sm shrink-0 gap-2">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {/* Avatar Circle */}
          <div className="w-10 h-10 rounded-full bg-[#128C7E] border border-white/20 text-white font-black text-sm flex items-center justify-center shadow-inner shrink-0">
            {currentRole === 'student' ? (
              <GraduationCap className="w-5 h-5 text-amber-200" />
            ) : (
              <User className="w-5 h-5 text-white" />
            )}
          </div>

          <div className="min-w-0">
            <h3 className="font-bold text-sm sm:text-base text-white truncate leading-tight">
              {currentRole === 'student'
                ? activeTeacher
                  ? `الشيخ: ${activeTeacher.name}`
                  : 'معلم الحلقة'
                : activeStudent
                ? activeStudent.fullName
                : 'حدد طالباً'}
            </h3>
          </div>
        </div>

        {/* Action Buttons in Header: Delete All + Close */}
        <div className="flex items-center gap-1.5 shrink-0">
          {activeStudent && activeTeacher && messages.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setIsClearAllDialogOpen(true);
                setClearPasscode('');
                setClearPasscodeError('');
              }}
              className="px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-rose-600/90 text-white text-xs font-bold transition-all flex items-center gap-1 border border-white/20 hover:border-rose-500 shadow-2xs cursor-pointer"
              title="حذف جميع رسائل هذه المحادثة (يتطلب رمز التأكيد: A1B2C3)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">حذف الكل</span>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق المحادثة"
              className="p-1.5 rounded-full text-white/80 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Teacher Student Switcher Tabs (WhatsApp style contacts bar) */}
      {currentRole === 'teacher' && teacherStudents.length > 0 && (
        <div className="bg-[#f0f2f5] border-b border-[#e9edef] px-3 py-2 overflow-x-auto flex items-center gap-2 no-scrollbar shrink-0">
          <span className="text-[11px] font-bold text-[#54656f] shrink-0">
            الطلاب:
          </span>
          {teacherStudents.map((st) => {
            const unread = unreadCounts[st.id] || 0;
            const isSelected = activeStudent?.id === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectContact(st.id);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-[#008069] text-white shadow-xs'
                    : 'bg-white text-[#111b21] border border-[#e9edef] hover:bg-white/80'
                }`}
              >
                <span>{st.fullName}</span>
                {unread > 0 && (
                  <span className="w-4 h-4 rounded-full bg-[#25D366] text-white font-black text-[10px] flex items-center justify-center">
                    {unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* WhatsApp Chat Body: Background `#efeae2` */}
      <div
        ref={scrollContainerRef}
        className="flex-1 p-3 sm:p-4 overflow-y-auto bg-[#efeae2] space-y-2.5 relative"
        style={{
          backgroundImage:
            'radial-gradient(#d6cdc4 0.75px, transparent 0.75px)',
          backgroundSize: '16px 16px',
        }}
      >
        {/* Missing Teacher Warning for Student */}
        {currentRole === 'student' && !activeTeacher && (
          <div className="p-6 bg-white/95 rounded-2xl border border-stone-200 text-center space-y-2 my-8 shadow-xs max-w-sm mx-auto">
            <GraduationCap className="w-8 h-8 text-stone-400 mx-auto" />
            <h4 className="font-bold text-stone-900 text-sm">
              لم يتم تعيين معلم لحلقتك ({currentStudent?.halaqahName || 'العامة'}) بعد
            </h4>
            <p className="text-xs text-stone-500">
              سيمكنك مراسلة المعلم بمجرد ربطه بالحلقة من قِبل إدارة المجمع.
            </p>
          </div>
        )}

        {/* Missing Student Selection Warning for Teacher */}
        {currentRole === 'teacher' && !activeStudent && (
          <div className="p-6 bg-white/95 rounded-2xl border border-stone-200 text-center space-y-2 my-8 shadow-xs max-w-sm mx-auto">
            <User className="w-8 h-8 text-stone-400 mx-auto" />
            <p className="text-xs text-stone-500 font-bold">
              لا يوجد طلاب مسجلون في حلقتك حالياً للمراسلة
            </p>
          </div>
        )}

        {/* Empty Conversation Banner */}
        {activeStudent && activeTeacher && messages.length === 0 && (
          <div className="py-12 text-center space-y-2">
            <div className="inline-block bg-white/85 backdrop-blur-xs text-[#54656f] text-xs font-semibold px-4 py-2 rounded-xl shadow-xs">
              لا توجد رسائل سابقة. يمكنك بدء المحادثة الآن.
            </div>
          </div>
        )}

        {/* Messages List with WhatsApp date pills */}
        {messages.map((msg, index) => {
          const isMine =
            (currentRole === 'student' && msg.senderRole === 'student') ||
            (currentRole === 'teacher' && msg.senderRole === 'teacher');

          const showDatePill =
            index === 0 ||
            formatMsgDatePill(msg.createdAt) !== formatMsgDatePill(messages[index - 1].createdAt);

          return (
            <React.Fragment key={msg.id}>
              {showDatePill && (
                <div className="flex justify-center my-2">
                  <span className="bg-white/90 text-[#54656f] text-[11px] font-semibold px-3 py-0.5 rounded-md shadow-2xs">
                    {formatMsgDatePill(msg.createdAt)}
                  </span>
                </div>
              )}

              <div className={`flex flex-col ${isMine ? 'items-start' : 'items-end'} group`}>
                <div
                  className={`relative max-w-[85%] sm:max-w-[75%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] ${
                    isMine
                      ? 'bg-[#d9fdd3] text-[#111b21] rounded-tr-xs'
                      : 'bg-white text-[#111b21] rounded-tl-xs'
                  }`}
                >
                  {/* Sender name for received message */}
                  {!isMine && (
                    <div className="text-[11px] font-bold text-[#008069] mb-0.5">
                      {msg.senderName}
                    </div>
                  )}

                  <p className="whitespace-pre-wrap select-text">{msg.text}</p>

                  {/* Message Meta: Time + WhatsApp Blue Double Checkmark */}
                  <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] text-[#667781] select-none">
                    <span>{formatTimeEn(msg.createdAt)}</span>

                    {/* WhatsApp checkmarks for sent messages: 2 marks when delivered, 2 blue marks when seen */}
                    {isMine && (
                      <CheckCheck
                        className={`w-3.5 h-3.5 transition-colors ${
                          msg.read ? 'text-[#53bdeb]' : 'text-[#8696a0]'
                        }`}
                        title={msg.read ? 'تمت المشاهدة والقراءة (صحين باللون الأزرق)' : 'تم الإرسال والتسليم (صحين)'}
                      />
                    )}
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* WhatsApp Input Bar */}
      <div className="bg-[#f0f2f5] border-t border-[#e9edef] p-2.5 sm:p-3 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            autoFocus={false}
            tabIndex={0}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!activeStudent || !activeTeacher}
            placeholder={
              !activeStudent || !activeTeacher
                ? 'لا يمكن الإرسال حالياً'
                : 'اكتب رسالة...'
            }
            className="flex-1 px-4 py-2 sm:py-2.5 rounded-full border border-[#e9edef] text-sm text-[#111b21] bg-white focus:outline-none focus:ring-1 focus:ring-[#00a884] disabled:bg-stone-100 transition-all shadow-xs placeholder-[#8696a0]"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || !activeStudent || !activeTeacher}
            className="w-10 h-10 rounded-full bg-[#00a884] hover:bg-[#008069] disabled:bg-stone-300 text-white flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed shadow-md shrink-0"
            title="إرسال الرسالة"
          >
            <Send className="w-4 h-4 -scale-x-100" />
          </button>
        </form>
      </div>

      {/* Modal: Clear All Messages with this contact (requires A1B2C3) */}
      {isClearAllDialogOpen && (
        <div className="absolute inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-stone-200 text-right space-y-4">
            <div className="flex items-center gap-2.5 text-rose-600">
              <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h4 className="font-black text-sm text-stone-900">
                  حذف جميع رسائل المحادثة
                </h4>
                <p className="text-[11px] text-stone-500">
                  مع: {activeStudent?.fullName || activeTeacher?.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed font-medium">
              يرجى كتابة الرمز:{' '}
              <span className="font-black text-rose-600 px-1.5 py-0.5 bg-rose-50 rounded border border-rose-200 tracking-wider">
                A1B2C3
              </span>
            </p>

            <form onSubmit={handleConfirmClearAll} className="space-y-3">
              <div className="space-y-1">
                <div className="relative">
                  <input
                    type="text"
                    value={clearPasscode}
                    onChange={(e) => {
                      setClearPasscode(e.target.value);
                      setClearPasscodeError('');
                    }}
                    placeholder="اكتب A1B2C3 هنا"
                    dir="ltr"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 text-sm text-center uppercase tracking-widest font-black text-stone-900 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                  />
                  <KeyRound className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                </div>
                {clearPasscodeError && (
                  <p className="text-[11px] font-bold text-rose-600">
                    {clearPasscodeError}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={clearPasscode.trim().toUpperCase() !== 'A1B2C3'}
                  className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-stone-300 text-white font-bold text-xs transition-colors cursor-pointer disabled:cursor-not-allowed shadow-xs"
                >
                  تأكيد مسح الرسائل
                </button>
                <button
                  type="button"
                  onClick={() => setIsClearAllDialogOpen(false)}
                  className="py-2 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
