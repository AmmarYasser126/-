import React, { useState, useEffect } from 'react';
import { Student, SessionType, ReviewType, TeacherGrade, SessionLog, EvaluationPoints } from '../types';
import { SURAHS, getSurahByNumber } from '../data/quranData';
import { saveLog, isRecitationDayToday, getRecitationDaysNames } from '../utils/storage';
import {
  X,
  BookOpen,
  RotateCcw,
  Calendar,
  CheckCircle2,
  User,
  Search,
  Layers,
  Star,
  ArrowLeftRight,
  AlertCircle,
  MessageCircle,
} from 'lucide-react';
import { formatNumberEn } from '../utils/format';

interface LogSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  studentsList?: Student[];
  onLogSaved: (savedLog: SessionLog) => void;
  defaultType?: SessionType;
  isTeacher?: boolean;
}

export const LogSessionModal: React.FC<LogSessionModalProps> = ({
  isOpen,
  onClose,
  student,
  studentsList = [],
  onLogSaved,
  defaultType = 'combined',
  isTeacher = false,
}) => {
  const isBlockedDayForTeacher = Boolean(isTeacher && !isRecitationDayToday());
  const [selectedStudent, setSelectedStudent] = useState<Student>(student);
  const [sessionType, setSessionType] = useState<SessionType>(defaultType);
  
  // Hifz Fields
  const [hifzMode, setHifzMode] = useState<'ayahs' | 'surahs'>('ayahs');
  const [hifzSurahNumber, setHifzSurahNumber] = useState<number>(student.currentSurahNumber || 2);
  const [hifzStartAyah, setHifzStartAyah] = useState<number>(1);
  const [hifzEndAyah, setHifzEndAyah] = useState<number>(10);
  const [hifzFromSurah, setHifzFromSurah] = useState<number>(student.currentSurahNumber || 114);
  const [hifzToSurah, setHifzToSurah] = useState<number>(student.currentSurahNumber || 112);
  
  // Murajaah Fields
  const [murajaahMode, setMurajaahMode] = useState<'ayahs' | 'surahs'>('ayahs');
  const [murajaahSurahNumber, setMurajaahSurahNumber] = useState<number>(student.currentSurahNumber || 114);
  const [murajaahStartAyah, setMurajaahStartAyah] = useState<number>(1);
  const [murajaahEndAyah, setMurajaahEndAyah] = useState<number>(6);
  const [murajaahFromSurah, setMurajaahFromSurah] = useState<number>(114);
  const [murajaahToSurah, setMurajaahToSurah] = useState<number>(112);
  const [reviewType, setReviewType] = useState<ReviewType>('مراجعة قريبة');
  
  const [sessionDate, setSessionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [teacherGrade, setTeacherGrade] = useState<TeacherGrade>('ممتاز');
  const [teacherNotes, setTeacherNotes] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [savedLogForWhatsApp, setSavedLogForWhatsApp] = useState<SessionLog | null>(null);

  // 6-Points Star Evaluation States (All Manual)
  // الحضور (0 أو 1)، الحفظ (0 أو 2 فقط - لا خيار لنقطة واحدة)، المراجعة (0 أو 1)، الانضباط (0 أو 1)، اللبس (0 أو 1)
  const [attendancePoint, setAttendancePoint] = useState<number>(1);
  const [hifzPoints, setHifzPoints] = useState<number>(2); // 0 or 2 only
  const [murajaahPoint, setMurajaahPoint] = useState<number>(1);
  const [disciplinePoint, setDisciplinePoint] = useState<number>(1);
  const [attirePoint, setAttirePoint] = useState<number>(1);

  useEffect(() => {
    setSelectedStudent(student);
    if (student.currentSurahNumber) {
      setHifzSurahNumber(student.currentSurahNumber);
    }
  }, [student]);

  useEffect(() => {
    setSessionType(defaultType);
    if (!isOpen) {
      setSavedLogForWhatsApp(null);
    }
  }, [defaultType, isOpen]);

  // Adjust star points based on sessionType
  // When sessionType is 'hifz' (حفظ جديد فقط): murajaah is 0 and disabled
  // When sessionType is 'murajaah' (مراجعة فقط): hifz is 0 and disabled
  // When sessionType is 'combined': both hifz and murajaah are enabled
  const handleSessionTypeChange = (type: 'combined' | 'hifz' | 'murajaah') => {
    setSessionType(type);
    if (type === 'hifz') {
      setMurajaahPoint(0);
      if (hifzPoints === 0) setHifzPoints(2);
    } else if (type === 'murajaah') {
      setHifzPoints(0);
      if (murajaahPoint === 0) setMurajaahPoint(1);
    } else if (type === 'combined') {
      if (hifzPoints === 0) setHifzPoints(2);
      if (murajaahPoint === 0) setMurajaahPoint(1);
    }
  };

  // Reset to full points initially when modal opens according to defaultType
  useEffect(() => {
    if (isOpen) {
      setAttendancePoint(1);
      setDisciplinePoint(1);
      setAttirePoint(1);
      if (defaultType === 'hifz') {
        setHifzPoints(2);
        setMurajaahPoint(0);
      } else if (defaultType === 'murajaah') {
        setHifzPoints(0);
        setMurajaahPoint(1);
      } else {
        setHifzPoints(2);
        setMurajaahPoint(1);
      }
    }
  }, [isOpen, defaultType]);

  const totalStars = Math.max(
    0,
    Math.min(6, attendancePoint + hifzPoints + murajaahPoint + disciplinePoint + attirePoint)
  );

  // Sync teacher grade automatically with total stars based on sessionType
  useEffect(() => {
    const maxStarsForType = sessionType === 'combined' ? 6 : sessionType === 'hifz' ? 5 : 4;
    const ratio = totalStars / maxStarsForType;
    if (ratio >= 0.95) setTeacherGrade('ممتاز');
    else if (ratio >= 0.75) setTeacherGrade('جيد جدًا');
    else if (ratio >= 0.55) setTeacherGrade('جيد');
    else setTeacherGrade('يحتاج إعادة');
  }, [totalStars, sessionType]);

  const currentHifzSurah = getSurahByNumber(hifzSurahNumber) || SURAHS[0];
  const currentMurajaahSurah = getSurahByNumber(murajaahSurahNumber) || SURAHS[113];

  useEffect(() => {
    if (currentHifzSurah) {
      if (hifzEndAyah > currentHifzSurah.numberOfAyahs) {
        setHifzEndAyah(currentHifzSurah.numberOfAyahs);
      }
      if (hifzStartAyah > currentHifzSurah.numberOfAyahs) {
        setHifzStartAyah(1);
      }
    }
  }, [hifzSurahNumber]);

  useEffect(() => {
    if (currentMurajaahSurah) {
      if (murajaahEndAyah > currentMurajaahSurah.numberOfAyahs) {
        setMurajaahEndAyah(currentMurajaahSurah.numberOfAyahs);
      }
      if (murajaahStartAyah > currentMurajaahSurah.numberOfAyahs) {
        setMurajaahStartAyah(1);
      }
    }
  }, [murajaahSurahNumber]);

  if (!isOpen) return null;

  const calculatedHifzAyahs = Math.max(0, hifzEndAyah - hifzStartAyah + 1);
  const calculatedMurajaahAyahs = Math.max(0, murajaahEndAyah - murajaahStartAyah + 1);

  // Range Calculations for Hifz
  const hifzMin = Math.min(hifzFromSurah, hifzToSurah);
  const hifzMax = Math.max(hifzFromSurah, hifzToSurah);
  const hifzSurahsInRange = SURAHS.filter((s) => s.number >= hifzMin && s.number <= hifzMax);
  const hifzRangeTotalAyahs = hifzSurahsInRange.reduce((sum, s) => sum + s.numberOfAyahs, 0);
  const fromHifzObj = getSurahByNumber(hifzFromSurah) || SURAHS[113];
  const toHifzObj = getSurahByNumber(hifzToSurah) || SURAHS[111];

  // Range Calculations for Murajaah
  const murajaahMin = Math.min(murajaahFromSurah, murajaahToSurah);
  const murajaahMax = Math.max(murajaahFromSurah, murajaahToSurah);
  const murajaahSurahsInRange = SURAHS.filter((s) => s.number >= murajaahMin && s.number <= murajaahMax);
  const murajaahRangeTotalAyahs = murajaahSurahsInRange.reduce((sum, s) => sum + s.numberOfAyahs, 0);
  const fromMurajaahObj = getSurahByNumber(murajaahFromSurah) || SURAHS[113];
  const toMurajaahObj = getSurahByNumber(murajaahToSurah) || SURAHS[111];

  const effectiveHifzAyahsCount = hifzMode === 'surahs' ? hifzRangeTotalAyahs : calculatedHifzAyahs;
  const effectiveMurajaahAyahsCount = murajaahMode === 'surahs' ? murajaahRangeTotalAyahs : calculatedMurajaahAyahs;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (isBlockedDayForTeacher) {
      setErrorMessage(
        `عذراً، لا يمكن توثيق التسميع اليوم؛ لأن أيام التسميع المعتمدة للمعلمين هي: (${getRecitationDaysNames()}). يرجى مراجعة إدارة الحلقات.`
      );
      return;
    }

    const needsHifz = sessionType === 'hifz' || sessionType === 'combined';
    const needsMurajaah = sessionType === 'murajaah' || sessionType === 'combined';

    if (needsHifz && hifzMode === 'ayahs') {
      if (hifzStartAyah < 1) {
        setErrorMessage('رقم بداية آية الحفظ يجب أن يكون 1 أو أكثر');
        return;
      }
      if (hifzEndAyah > currentHifzSurah.numberOfAyahs) {
        setErrorMessage(`سورة ${currentHifzSurah.name} تحتوي على ${currentHifzSurah.numberOfAyahs} آية فقط`);
        return;
      }
      if (hifzEndAyah < hifzStartAyah) {
        setErrorMessage('نهاية آيات الحفظ يجب أن تكون أكبر من أو تساوي البداية');
        return;
      }
    }

    if (needsMurajaah && murajaahMode === 'ayahs') {
      if (murajaahStartAyah < 1) {
        setErrorMessage('رقم بداية آية المراجعة يجب أن يكون 1 أو أكثر');
        return;
      }
      if (murajaahEndAyah > currentMurajaahSurah.numberOfAyahs) {
        setErrorMessage(`سورة ${currentMurajaahSurah.name} تحتوي على ${currentMurajaahSurah.numberOfAyahs} آية فقط`);
        return;
      }
      if (murajaahEndAyah < murajaahStartAyah) {
        setErrorMessage('نهاية آيات المراجعة يجب أن تكون أكبر من أو تساوي البداية');
        return;
      }
    }

    const evalPoints: EvaluationPoints = {
      attendance: attendancePoint,
      hifz: hifzPoints,
      murajaah: murajaahPoint,
      discipline: disciplinePoint,
      attire: attirePoint,
      totalPoints: totalStars,
    };

    let newLog: SessionLog;

    if (sessionType === 'combined') {
      newLog = {
        id: `log_${Date.now()}`,
        studentId: selectedStudent.id,
        studentName: selectedStudent.fullName,
        type: 'combined',

        // Hifz Fields
        isSurahRange: hifzMode === 'surahs',
        fromSurahNumber: hifzMode === 'surahs' ? hifzFromSurah : undefined,
        fromSurahName: hifzMode === 'surahs' ? fromHifzObj.name : undefined,
        toSurahNumber: hifzMode === 'surahs' ? hifzToSurah : undefined,
        toSurahName: hifzMode === 'surahs' ? toHifzObj.name : undefined,
        surahsIncluded: hifzMode === 'surahs' ? hifzSurahsInRange.map((s) => s.number) : undefined,
        surahNumber: hifzMode === 'surahs' ? toHifzObj.number : currentHifzSurah.number,
        surahName: hifzMode === 'surahs'
          ? (fromHifzObj.number === toHifzObj.number ? fromHifzObj.name : `من سورة ${fromHifzObj.name} إلى سورة ${toHifzObj.name}`)
          : currentHifzSurah.name,
        startAyah: hifzMode === 'surahs' ? 1 : hifzStartAyah,
        endAyah: hifzMode === 'surahs' ? toHifzObj.numberOfAyahs : hifzEndAyah,
        ayahsCount: effectiveHifzAyahsCount,

        // Murajaah Fields
        murajaahIsSurahRange: murajaahMode === 'surahs',
        murajaahFromSurahNumber: murajaahMode === 'surahs' ? murajaahFromSurah : undefined,
        murajaahFromSurahName: murajaahMode === 'surahs' ? fromMurajaahObj.name : undefined,
        murajaahToSurahNumber: murajaahMode === 'surahs' ? murajaahToSurah : undefined,
        murajaahToSurahName: murajaahMode === 'surahs' ? toMurajaahObj.name : undefined,
        murajaahSurahsIncluded: murajaahMode === 'surahs' ? murajaahSurahsInRange.map((s) => s.number) : undefined,
        murajaahSurahNumber: murajaahMode === 'surahs' ? toMurajaahObj.number : currentMurajaahSurah.number,
        murajaahSurahName: murajaahMode === 'surahs'
          ? (fromMurajaahObj.number === toMurajaahObj.number ? fromMurajaahObj.name : `من سورة ${fromMurajaahObj.name} إلى سورة ${toMurajaahObj.name}`)
          : currentMurajaahSurah.name,
        murajaahStartAyah: murajaahMode === 'surahs' ? 1 : murajaahStartAyah,
        murajaahEndAyah: murajaahMode === 'surahs' ? toMurajaahObj.numberOfAyahs : murajaahEndAyah,
        murajaahAyahsCount: effectiveMurajaahAyahsCount,

        reviewType: reviewType,
        date: sessionDate,
        teacherGrade: teacherGrade,
        teacherNotes: teacherNotes.trim() || undefined,
        evaluationPoints: evalPoints,
        totalStars: totalStars,
        isConfirmedByTeacher: true,
        parentNotified: false,
        createdAt: new Date().toISOString(),
      };
    } else if (sessionType === 'hifz') {
      newLog = {
        id: `log_${Date.now()}`,
        studentId: selectedStudent.id,
        studentName: selectedStudent.fullName,
        type: 'hifz',
        isSurahRange: hifzMode === 'surahs',
        fromSurahNumber: hifzMode === 'surahs' ? hifzFromSurah : undefined,
        fromSurahName: hifzMode === 'surahs' ? fromHifzObj.name : undefined,
        toSurahNumber: hifzMode === 'surahs' ? hifzToSurah : undefined,
        toSurahName: hifzMode === 'surahs' ? toHifzObj.name : undefined,
        surahsIncluded: hifzMode === 'surahs' ? hifzSurahsInRange.map((s) => s.number) : undefined,
        surahNumber: hifzMode === 'surahs' ? toHifzObj.number : currentHifzSurah.number,
        surahName: hifzMode === 'surahs'
          ? (fromHifzObj.number === toHifzObj.number ? fromHifzObj.name : `من سورة ${fromHifzObj.name} إلى سورة ${toHifzObj.name}`)
          : currentHifzSurah.name,
        startAyah: hifzMode === 'surahs' ? 1 : hifzStartAyah,
        endAyah: hifzMode === 'surahs' ? toHifzObj.numberOfAyahs : hifzEndAyah,
        ayahsCount: effectiveHifzAyahsCount,
        date: sessionDate,
        teacherGrade: teacherGrade,
        teacherNotes: teacherNotes.trim() || undefined,
        evaluationPoints: evalPoints,
        totalStars: totalStars,
        isConfirmedByTeacher: true,
        parentNotified: false,
        createdAt: new Date().toISOString(),
      };
    } else {
      newLog = {
        id: `log_${Date.now()}`,
        studentId: selectedStudent.id,
        studentName: selectedStudent.fullName,
        type: 'murajaah',
        murajaahIsSurahRange: murajaahMode === 'surahs',
        murajaahFromSurahNumber: murajaahMode === 'surahs' ? murajaahFromSurah : undefined,
        murajaahFromSurahName: murajaahMode === 'surahs' ? fromMurajaahObj.name : undefined,
        murajaahToSurahNumber: murajaahMode === 'surahs' ? murajaahToSurah : undefined,
        murajaahToSurahName: murajaahMode === 'surahs' ? toMurajaahObj.name : undefined,
        murajaahSurahsIncluded: murajaahMode === 'surahs' ? murajaahSurahsInRange.map((s) => s.number) : undefined,
        surahNumber: murajaahMode === 'surahs' ? toMurajaahObj.number : currentMurajaahSurah.number,
        surahName: murajaahMode === 'surahs'
          ? (fromMurajaahObj.number === toMurajaahObj.number ? fromMurajaahObj.name : `من سورة ${fromMurajaahObj.name} إلى سورة ${toMurajaahObj.name}`)
          : currentMurajaahSurah.name,
        startAyah: murajaahMode === 'surahs' ? 1 : murajaahStartAyah,
        endAyah: murajaahMode === 'surahs' ? toMurajaahObj.numberOfAyahs : murajaahEndAyah,
        ayahsCount: effectiveMurajaahAyahsCount,
        date: sessionDate,
        reviewType: reviewType,
        teacherGrade: teacherGrade,
        teacherNotes: teacherNotes.trim() || undefined,
        evaluationPoints: evalPoints,
        totalStars: totalStars,
        isConfirmedByTeacher: true,
        parentNotified: false,
        createdAt: new Date().toISOString(),
      };
    }

    saveLog(newLog);
    onLogSaved(newLog);
    setSavedLogForWhatsApp(newLog);
  };

  if (savedLogForWhatsApp) {
    const parentPhone = selectedStudent.rawPhoneNumber ? selectedStudent.rawPhoneNumber.replace(/\D/g, '').replace(/^0/, '') : '';

    let recitationSummary = '';
    if (savedLogForWhatsApp.type === 'combined') {
      recitationSummary = `• الحفظ الجديد: سورة ${savedLogForWhatsApp.surahName} (الآيات ${formatNumberEn(savedLogForWhatsApp.startAyah)} - ${formatNumberEn(savedLogForWhatsApp.endAyah)})\n• المراجعة: ${savedLogForWhatsApp.murajaahSurahName || 'مراجعة مقررة'}`;
    } else if (savedLogForWhatsApp.type === 'hifz') {
      recitationSummary = `• الحفظ الجديد: سورة ${savedLogForWhatsApp.surahName} (الآيات ${formatNumberEn(savedLogForWhatsApp.startAyah)} - ${formatNumberEn(savedLogForWhatsApp.endAyah)})`;
    } else {
      recitationSummary = `• المراجعة: ${savedLogForWhatsApp.murajaahSurahName || savedLogForWhatsApp.surahName || 'مراجعة القرآن'}`;
    }

    const whatsappMessage = `السلام عليكم ورحمة الله وبركاته
ولي أمر الطالب: ${selectedStudent.fullName}

تم بحمد الله توثيق جلسة تسميع اليوم في مجمع جامع الوالدين:
${recitationSummary}
• التقدير: ${savedLogForWhatsApp.teacherGrade} (${formatNumberEn(savedLogForWhatsApp.totalStars || 0)} نجوم ⭐)
${savedLogForWhatsApp.teacherNotes ? `• ملاحظة المعلم: ${savedLogForWhatsApp.teacherNotes}\n` : ''}
نسأل الله أن يبارك في جهود الطالب وأن يجعله من حفظة كتابه الكريم.

مع تحيات إدارة شؤون الحلقات بجامع الوالدين`;

    const whatsappUrl = parentPhone ? `https://wa.me/966${parentPhone}?text=${encodeURIComponent(whatsappMessage)}` : '';

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in" dir="rtl">
        <div id="log-session-success-card" className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col p-6 text-center animate-in zoom-in-95">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>

          <h3 className="text-base sm:text-lg font-bold text-stone-900 mb-1">
            تم توثيق التسميع بنجاح!
          </h3>
          <p className="text-xs text-stone-500 mb-4">
            للطالب: <span className="font-bold text-stone-800">{selectedStudent.fullName}</span>
          </p>

          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 text-xs text-stone-700 text-right space-y-1.5 mb-4">
            {savedLogForWhatsApp.surahName && (
              <div className="flex justify-between items-center">
                <span className="text-stone-500">الحفظ:</span>
                <span className="font-bold text-emerald-900">
                  سورة {savedLogForWhatsApp.surahName} ({formatNumberEn(savedLogForWhatsApp.startAyah)} - {formatNumberEn(savedLogForWhatsApp.endAyah)})
                </span>
              </div>
            )}
            {savedLogForWhatsApp.murajaahSurahName && (
              <div className="flex justify-between items-center">
                <span className="text-stone-500">المراجعة:</span>
                <span className="font-bold text-teal-900">{savedLogForWhatsApp.murajaahSurahName}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1 border-t border-stone-200">
              <span className="text-stone-500">التقدير والنجوم:</span>
              <span className="font-bold text-amber-700 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>{savedLogForWhatsApp.teacherGrade} ({formatNumberEn(savedLogForWhatsApp.totalStars || 0)} نجوم)</span>
              </span>
            </div>
          </div>

          {parentPhone ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#1ebd5b] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mb-2"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>إرسال رسالة واتساب لولي الأمر</span>
            </a>
          ) : (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium mb-2">
              لم يتم تسجيل رقم جوال لولي أمر هذا الطالب.
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setSavedLogForWhatsApp(null);
              onClose();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in" dir="rtl">
      <div
        id="log-session-modal-card"
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-900 to-stone-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-800 border border-emerald-600 flex items-center justify-center text-amber-300">
              {sessionType === 'combined' ? (
                <Layers className="w-5 h-5" />
              ) : sessionType === 'hifz' ? (
                <BookOpen className="w-5 h-5" />
              ) : (
                <RotateCcw className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {sessionType === 'combined'
                  ? 'تسجيل حفظ جديد ومراجعة معاً'
                  : sessionType === 'hifz'
                  ? 'توثيق حفظ جديد فقط'
                  : 'توثيق مراجعة وتثبيت فقط'}
              </h2>
              <p className="text-xs text-emerald-200/80">جامع الوالدين — نظام التحفيظ والمراجعة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="p-1.5 rounded-lg text-stone-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {isBlockedDayForTeacher && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-2xl text-rose-900 text-xs font-bold flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-black text-sm text-rose-950">توثيق التسميع غير متاح اليوم للمعلمين</div>
                <p className="font-normal text-rose-800 mt-1 leading-relaxed">
                  اليوم غير مشمول في أيام التسميع المعتمدة للمعلمين ({getRecitationDaysNames()}). تم إيقاف زر التوثيق حسب توجيهات الإدارة، بينما يملك المشرف العام صلاحية التوثيق وتعديل هذه الأيام من لوحة الإدارة.
                </p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Student Selector */}
          {studentsList.length > 1 ? (
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                تحديد الطالب المُسمّع:
              </label>
              <select
                value={selectedStudent.id}
                onChange={(e) => {
                  const st = studentsList.find((s) => s.id === e.target.value);
                  if (st) setSelectedStudent(st);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-bold text-stone-900 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-600"
              >
                {studentsList.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.fullName} ({st.halaqahName || 'حلقة عامة'})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-stone-700">
                <User className="w-4 h-4 text-emerald-700" />
                <span>الطالب:</span>
                <span className="font-bold text-stone-900">{selectedStudent.fullName}</span>
              </div>
              <span className="text-stone-500 font-medium">{selectedStudent.halaqahName}</span>
            </div>
          )}

          {/* Type Toggle: Combined vs Hifz vs Murajaah */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">نوع الجلسة:</label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-stone-100 rounded-2xl">
              <button
                type="button"
                onClick={() => handleSessionTypeChange('combined')}
                className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  sessionType === 'combined'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-amber-300" />
                <span>حفظ ومراجعة معاً</span>
              </button>
              <button
                type="button"
                onClick={() => handleSessionTypeChange('hifz')}
                className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  sessionType === 'hifz'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>حفظ جديد فقط</span>
              </button>
              <button
                type="button"
                onClick={() => handleSessionTypeChange('murajaah')}
                className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  sessionType === 'murajaah'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>مراجعة فقط</span>
              </button>
            </div>
          </div>

          {/* SECTION 1: HIFZ SECTION (shown if combined or hifz) */}
          {(sessionType === 'combined' || sessionType === 'hifz') && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
              <div className="flex flex-wrap items-center justify-between border-b border-emerald-200 pb-2 gap-2">
                <span className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-emerald-700" />
                  بيانات الحفظ الجديد
                </span>
                
                {/* Range vs Single Surah Selector */}
                <div className="flex items-center gap-1 bg-white/90 p-0.5 rounded-lg border border-emerald-200 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setHifzMode('ayahs')}
                    className={`px-2 py-1 rounded-md font-bold transition-all ${
                      hifzMode === 'ayahs'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    تحديد بالآيات
                  </button>
                  <button
                    type="button"
                    onClick={() => setHifzMode('surahs')}
                    className={`px-2 py-1 rounded-md font-bold transition-all flex items-center gap-1 ${
                      hifzMode === 'surahs'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                    <span>نطاق سور (من سورة إلى سورة)</span>
                  </button>
                </div>
              </div>

              {hifzMode === 'ayahs' ? (
                <>
                  {/* Surah select for Hifz */}
                  <div>
                    <select
                      value={hifzSurahNumber}
                      onChange={(e) => {
                        const sNum = parseInt(e.target.value, 10);
                        setHifzSurahNumber(sNum);
                        const sObj = getSurahByNumber(sNum);
                        if (sObj) {
                          setHifzStartAyah(1);
                          setHifzEndAyah(Math.min(10, sObj.numberOfAyahs));
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-300 text-xs font-bold text-stone-900 bg-white focus:ring-2 focus:ring-emerald-500 shadow-xs"
                    >
                      {SURAHS.map((s) => (
                        <option key={s.number} value={s.number}>
                          {s.number}. سورة {s.name} ({s.numberOfAyahs} آية)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Ayahs Range for Hifz */}
                  <div className="grid grid-cols-3 gap-2 items-center bg-white p-2.5 rounded-xl border border-emerald-200">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 mb-0.5">من آية:</label>
                      <input
                        type="number"
                        min={1}
                        max={currentHifzSurah.numberOfAyahs}
                        value={hifzStartAyah}
                        onChange={(e) => setHifzStartAyah(parseInt(e.target.value, 10) || 1)}
                        className="w-full px-2 py-1.5 rounded-lg border border-stone-300 text-xs font-bold text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 mb-0.5">إلى آية:</label>
                      <input
                        type="number"
                        min={hifzStartAyah}
                        max={currentHifzSurah.numberOfAyahs}
                        value={hifzEndAyah}
                        onChange={(e) => setHifzEndAyah(parseInt(e.target.value, 10) || hifzStartAyah)}
                        className="w-full px-2 py-1.5 rounded-lg border border-stone-300 text-xs font-bold text-center"
                      />
                    </div>
                    <div className="text-center pt-2">
                      <span className="text-xs font-black text-emerald-800 block">
                        {calculatedHifzAyahs} آية
                      </span>
                      <span className="text-[10px] text-stone-400">إجمالي الحفظ</span>
                    </div>
                  </div>
                </>
              ) : (
                /* Surah Range Mode for Hifz */
                <div className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white p-2.5 rounded-xl border border-emerald-200">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">من سورة:</label>
                      <select
                        value={hifzFromSurah}
                        onChange={(e) => setHifzFromSurah(parseInt(e.target.value, 10))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 text-xs font-bold text-stone-900 bg-white"
                      >
                        {SURAHS.map((s) => (
                          <option key={`from_h_${s.number}`} value={s.number}>
                            {s.number}. سورة {s.name} ({s.numberOfAyahs} آية)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">إلى سورة:</label>
                      <select
                        value={hifzToSurah}
                        onChange={(e) => setHifzToSurah(parseInt(e.target.value, 10))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 text-xs font-bold text-stone-900 bg-white"
                      >
                        {SURAHS.map((s) => (
                          <option key={`to_h_${s.number}`} value={s.number}>
                            {s.number}. سورة {s.name} ({s.numberOfAyahs} آية)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="bg-emerald-100/60 p-2.5 rounded-xl border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="font-black text-emerald-950">
                        نطاق الحفظ: من سورة {fromHifzObj.name} إلى سورة {toHifzObj.name}
                      </div>
                      <div className="text-[11px] text-emerald-800">
                        يشمل {hifzSurahsInRange.length} سور ({hifzSurahsInRange.slice(0, 4).map(s => s.name).join('، ')}{hifzSurahsInRange.length > 4 ? '...' : ''})
                      </div>
                    </div>
                    <div className="bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-center font-black self-end sm:self-center shrink-0">
                      {hifzRangeTotalAyahs} آية معتمدة
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: MURAJAAH SECTION (shown if combined or murajaah) */}
          {(sessionType === 'combined' || sessionType === 'murajaah') && (
            <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-2xl space-y-3">
              <div className="flex flex-wrap items-center justify-between border-b border-teal-200 pb-2 gap-2">
                <span className="text-xs font-extrabold text-teal-950 flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-teal-700" />
                  بيانات المراجعة والتثبيت
                </span>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-white/90 p-0.5 rounded-lg border border-teal-200 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setMurajaahMode('ayahs')}
                      className={`px-2 py-1 rounded-md font-bold transition-all ${
                        murajaahMode === 'ayahs'
                          ? 'bg-teal-700 text-white shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      تحديد بالآيات
                    </button>
                    <button
                      type="button"
                      onClick={() => setMurajaahMode('surahs')}
                      className={`px-2 py-1 rounded-md font-bold transition-all flex items-center gap-1 ${
                        murajaahMode === 'surahs'
                          ? 'bg-teal-700 text-white shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <ArrowLeftRight className="w-3 h-3" />
                      <span>نطاق سور</span>
                    </button>
                  </div>
                </div>
              </div>

              {murajaahMode === 'ayahs' ? (
                <>
                  {/* Surah select for Murajaah */}
                  <div>
                    <select
                      value={murajaahSurahNumber}
                      onChange={(e) => {
                        const sNum = parseInt(e.target.value, 10);
                        setMurajaahSurahNumber(sNum);
                        const sObj = getSurahByNumber(sNum);
                        if (sObj) {
                          setMurajaahStartAyah(1);
                          setMurajaahEndAyah(Math.min(10, sObj.numberOfAyahs));
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-teal-300 text-xs font-bold text-stone-900 bg-white focus:ring-2 focus:ring-teal-500 shadow-xs"
                    >
                      {SURAHS.map((s) => (
                        <option key={s.number} value={s.number}>
                          {s.number}. سورة {s.name} ({s.numberOfAyahs} آية)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Ayahs Range for Murajaah */}
                  <div className="grid grid-cols-3 gap-2 items-center bg-white p-2.5 rounded-xl border border-teal-200">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 mb-0.5">من آية:</label>
                      <input
                        type="number"
                        min={1}
                        max={currentMurajaahSurah.numberOfAyahs}
                        value={murajaahStartAyah}
                        onChange={(e) => setMurajaahStartAyah(parseInt(e.target.value, 10) || 1)}
                        className="w-full px-2 py-1.5 rounded-lg border border-stone-300 text-xs font-bold text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 mb-0.5">إلى آية:</label>
                      <input
                        type="number"
                        min={murajaahStartAyah}
                        max={currentMurajaahSurah.numberOfAyahs}
                        value={murajaahEndAyah}
                        onChange={(e) => setMurajaahEndAyah(parseInt(e.target.value, 10) || murajaahStartAyah)}
                        className="w-full px-2 py-1.5 rounded-lg border border-stone-300 text-xs font-bold text-center"
                      />
                    </div>
                    <div className="text-center pt-2">
                      <span className="text-xs font-black text-teal-800 block">
                        {calculatedMurajaahAyahs} آية
                      </span>
                      <span className="text-[10px] text-stone-400">إجمالي المراجعة</span>
                    </div>
                  </div>
                </>
              ) : (
                /* Surah Range Mode for Murajaah */
                <div className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white p-2.5 rounded-xl border border-teal-200">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">من سورة:</label>
                      <select
                        value={murajaahFromSurah}
                        onChange={(e) => setMurajaahFromSurah(parseInt(e.target.value, 10))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-teal-300 text-xs font-bold text-stone-900 bg-white"
                      >
                        {SURAHS.map((s) => (
                          <option key={`from_m_${s.number}`} value={s.number}>
                            {s.number}. سورة {s.name} ({s.numberOfAyahs} آية)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">إلى سورة:</label>
                      <select
                        value={murajaahToSurah}
                        onChange={(e) => setMurajaahToSurah(parseInt(e.target.value, 10))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-teal-300 text-xs font-bold text-stone-900 bg-white"
                      >
                        {SURAHS.map((s) => (
                          <option key={`to_m_${s.number}`} value={s.number}>
                            {s.number}. سورة {s.name} ({s.numberOfAyahs} آية)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="bg-teal-100/60 p-2.5 rounded-xl border border-teal-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="font-black text-teal-950">
                        نطاق المراجعة: من سورة {fromMurajaahObj.name} إلى سورة {toMurajaahObj.name}
                      </div>
                      <div className="text-[11px] text-teal-800">
                        يشمل {murajaahSurahsInRange.length} سور ({murajaahSurahsInRange.slice(0, 4).map(s => s.name).join('، ')}{murajaahSurahsInRange.length > 4 ? '...' : ''})
                      </div>
                    </div>
                    <div className="bg-teal-700 text-white px-3 py-1.5 rounded-lg text-center font-black self-end sm:self-center shrink-0">
                      {murajaahRangeTotalAyahs} آية معتمدة
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-700" />
              <span>تاريخ جلسة التسميع:</span>
            </label>
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs text-stone-900 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 outline-none"
              required
            />
          </div>

          {/* Star Evaluation */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                <span>
                  تقييم النجوم ({sessionType === 'combined' ? '6 نقاط' : sessionType === 'hifz' ? '5 نقاط' : '4 نقاط'}):
                </span>
              </label>
              <span className="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                {totalStars} / {sessionType === 'combined' ? '6' : sessionType === 'hifz' ? '5' : '4'} نجوم
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {/* 1. الحضور (نقطة واحدة) */}
              <button
                type="button"
                onClick={() => setAttendancePoint(attendancePoint === 1 ? 0 : 1)}
                className={`py-2 px-1 rounded-xl text-xs font-bold border transition-colors cursor-pointer text-center flex flex-col items-center justify-center gap-0.5 ${
                  attendancePoint === 1
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                    : 'bg-stone-50 text-stone-600 border-stone-300 hover:bg-stone-100'
                }`}
              >
                <span>الحضور</span>
                <span className="text-[11px] opacity-90 font-medium">
                  {attendancePoint === 1 ? '1⭐' : '0'}
                </span>
              </button>

              {/* 2. الحفظ (نقطتان فقط - لا خيار لنقطة واحدة) */}
              <button
                type="button"
                disabled={sessionType === 'murajaah'}
                onClick={() => setHifzPoints(hifzPoints === 2 ? 0 : 2)}
                title={sessionType === 'murajaah' ? 'معطل: الجلسة الحالية مراجعة فقط' : 'تقييم الحفظ (0 أو 2)'}
                className={`py-2 px-1 rounded-xl text-xs font-bold border transition-colors text-center flex flex-col items-center justify-center gap-0.5 ${
                  sessionType === 'murajaah'
                    ? 'bg-stone-100 text-stone-300 border-dashed border-stone-200 cursor-not-allowed opacity-60'
                    : hifzPoints === 2
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs cursor-pointer'
                    : 'bg-stone-50 text-stone-600 border-stone-300 hover:bg-stone-100 cursor-pointer'
                }`}
              >
                <span>الحفظ</span>
                <span className="text-[11px] opacity-90 font-medium">
                  {sessionType === 'murajaah' ? 'غير مشمول' : hifzPoints === 2 ? '2⭐' : '0'}
                </span>
              </button>

              {/* 3. المراجعة (نقطة واحدة) */}
              <button
                type="button"
                disabled={sessionType === 'hifz'}
                onClick={() => setMurajaahPoint(murajaahPoint === 1 ? 0 : 1)}
                title={sessionType === 'hifz' ? 'معطل: الجلسة الحالية حفظ جديد فقط' : 'تقييم المراجعة (0 أو 1)'}
                className={`py-2 px-1 rounded-xl text-xs font-bold border transition-colors text-center flex flex-col items-center justify-center gap-0.5 ${
                  sessionType === 'hifz'
                    ? 'bg-stone-100 text-stone-300 border-dashed border-stone-200 cursor-not-allowed opacity-60'
                    : murajaahPoint === 1
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs cursor-pointer'
                    : 'bg-stone-50 text-stone-600 border-stone-300 hover:bg-stone-100 cursor-pointer'
                }`}
              >
                <span>المراجعة</span>
                <span className="text-[11px] opacity-90 font-medium">
                  {sessionType === 'hifz' ? 'غير مشمول' : murajaahPoint === 1 ? '1⭐' : '0'}
                </span>
              </button>

              {/* 4. الانضباط (نقطة واحدة) */}
              <button
                type="button"
                onClick={() => setDisciplinePoint(disciplinePoint === 1 ? 0 : 1)}
                className={`py-2 px-1 rounded-xl text-xs font-bold border transition-colors cursor-pointer text-center flex flex-col items-center justify-center gap-0.5 ${
                  disciplinePoint === 1
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                    : 'bg-stone-50 text-stone-600 border-stone-300 hover:bg-stone-100'
                }`}
              >
                <span>الانضباط</span>
                <span className="text-[11px] opacity-90 font-medium">
                  {disciplinePoint === 1 ? '1⭐' : '0'}
                </span>
              </button>

              {/* 5. اللبس (نقطة واحدة) */}
              <button
                type="button"
                onClick={() => setAttirePoint(attirePoint === 1 ? 0 : 1)}
                className={`py-2 px-1 rounded-xl text-xs font-bold border transition-colors cursor-pointer text-center flex flex-col items-center justify-center gap-0.5 ${
                  attirePoint === 1
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                    : 'bg-stone-50 text-stone-600 border-stone-300 hover:bg-stone-100'
                }`}
              >
                <span>اللبس</span>
                <span className="text-[11px] opacity-90 font-medium">
                  {attirePoint === 1 ? '1⭐' : '0'}
                </span>
              </button>
            </div>
          </div>

          {/* Teacher Grade */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">
              تقييم المعلم للتسميع:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['ممتاز', 'جيد جدًا', 'جيد', 'يحتاج إعادة'] as TeacherGrade[]).map((grade) => (
                <button
                  key={grade}
                  type="button"
                  onClick={() => setTeacherGrade(grade)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    teacherGrade === grade
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                      : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  {grade}
                </button>
              ))}
            </div>
          </div>

          {/* Teacher Notes */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              ملاحظات وتوجيهات المعلم (اختياري):
            </label>
            <input
              type="text"
              value={teacherNotes}
              onChange={(e) => setTeacherNotes(e.target.value)}
              placeholder="مثال: قراءة متقنة مع مراعاة الغنن والمدود..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs text-stone-900 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-600 font-bold text-xs"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isBlockedDayForTeacher}
              className={`flex-1 py-3 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 ${
                isBlockedDayForTeacher
                  ? 'bg-stone-300 text-stone-500 cursor-not-allowed shadow-none'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isBlockedDayForTeacher ? 'التوثيق مقفل اليوم للمعلمين' : 'حفظ وتوثيق التسميع'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

