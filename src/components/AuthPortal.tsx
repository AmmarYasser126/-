import React, { useState, useEffect } from 'react';
import { Role, Student, TeacherProfile, ParentProfile, HalaqahClass } from '../types';
import {
  TEACHER_GLOBAL_PASSWORD,
  ADMIN_GLOBAL_PASSWORD,
  getHalaqat,
  getTeachers,
  saveTeacher,
  getStudents,
  saveStudent,
  saveParent,
  findParentByPhone,
  getStudentsByParentPhone,
  getFirstStudentForParentPhone,
  findStudentByEmail,
  findTeacherByEmail,
  isPasswordUsedByTeacher,
  isPasswordUsedByStudent,
  getAdminSettings,
  DONATION_IBAN,
  DONATION_IBAN_DISPLAY,
  DONATION_ACCOUNT,
  DONATION_ACCOUNT_DISPLAY,
  OFFICIAL_WHATSAPP_NUMBER,
} from '../utils/storage';
import { GRADES_LIST, isAdultStage } from '../utils/gradeHelper';
import { SURAH_LIST } from '../data/quranData';
import { toEnglishDigits } from '../utils/format';
import { db } from '../utils/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { validateSaudiMobile, sendParentWhatsappPin, verifyParentPinCode, buildParentWhatsappPinUrl } from '../utils/smsService';
import {
  GraduationCap,
  BookOpen,
  Shield,
  User,
  Users,
  Phone,
  Lock,
  ArrowRight,
  School,
  KeyRound,
  Eye,
  EyeOff,
  Mail,
  AlertTriangle,
  Sparkles,
  AlertCircle,
  GraduationCap as GradeIcon,
  MessageSquare,
  MessageCircle,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  Send,
  Copy,
  Check,
  LogIn,
  Landmark,
} from 'lucide-react';

interface AuthPortalProps {
  onLoginSuccess: (
    role: Role,
    student?: Student,
    teacher?: TeacherProfile,
    rememberMe?: boolean,
    parentPhone?: string,
    parentProfile?: ParentProfile
  ) => void;
}

export const AuthPortal: React.FC<AuthPortalProps> = ({ onLoginSuccess }) => {
  const [selectedRole, setSelectedRole] = useState<Role | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const r = params.get('role');
      if (r === 'admin' || r === 'teacher' || r === 'student' || r === 'parent') {
        return r;
      }
    }
    return null;
  });
  const [studentMode, setStudentMode] = useState<'login' | 'register'>('login');
  const [teacherMode, setTeacherMode] = useState<'login' | 'register'>('login');

  // Teacher Form State
  const [teacherLoginEmail, setTeacherLoginEmail] = useState('');
  const [teacherLoginPassword, setTeacherLoginPassword] = useState('');
  const [teacherRegName, setTeacherRegName] = useState('');
  const [teacherRegEmail, setTeacherRegEmail] = useState('');
  const [teacherRegPhone, setTeacherRegPhone] = useState('');
  const [teacherRegHalaqahId, setTeacherRegHalaqahId] = useState('');
  const [teacherRegPassword, setTeacherRegPassword] = useState('');
  const [showTeacherPass, setShowTeacherPass] = useState(false);
  const [showTeacherRegPass, setShowTeacherRegPass] = useState(false);

  // Admin Form State
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);

  // Student Form State
  const [studentLoginEmail, setStudentLoginEmail] = useState('');
  const [studentLoginPassword, setStudentLoginPassword] = useState('');
  const [studentRegName, setStudentRegName] = useState('');
  const [studentRegEmail, setStudentRegEmail] = useState('');
  const [studentRegPhone, setStudentRegPhone] = useState('');
  const [studentPersonalPhone, setStudentPersonalPhone] = useState('');
  const [studentRegGrade, setStudentRegGrade] = useState<string>(GRADES_LIST[0]);
  const [studentRegAge, setStudentRegAge] = useState<string>('');
  const [studentRegStartSurah, setStudentRegStartSurah] = useState<'al-nas' | 'al-baqarah'>('al-nas');
  const [studentRegLastSurahNumber, setStudentRegLastSurahNumber] = useState<number>(67); // Default to 67 (Al-Mulk) or 114
  const [studentRegHalaqahId, setStudentRegHalaqahId] = useState('');
  const [studentRegPassword, setStudentRegPassword] = useState('');
  const [showStudentPass, setShowStudentPass] = useState(false);
  const [showStudentRegPass, setShowStudentRegPass] = useState(false);

  // Parent Form State
  const [parentPhone, setParentPhone] = useState('');
  const [parentPassword, setParentPassword] = useState('');
  const [showParentPass, setShowParentPass] = useState(false);
  const [parentName, setParentName] = useState('');
  const [parentStep, setParentStep] = useState<'phone' | 'pin'>('phone');
  const [parentPin, setParentPin] = useState('');
  const [sentPin, setSentPin] = useState<string | null>(null);
  const [whatsappChatUrl, setWhatsappChatUrl] = useState<string | null>(null);
  const [officialWhatsappUrl, setOfficialWhatsappUrl] = useState<string | null>(null);
  const [parentWhatsappUrl, setParentWhatsappUrl] = useState<string | null>(null);
  const [officialSenderPhone, setOfficialSenderPhone] = useState<string>(() => {
    const s = getAdminSettings();
    return s.officialSenderPhone && s.officialSenderPhone !== '0555555555'
      ? s.officialSenderPhone
      : OFFICIAL_WHATSAPP_NUMBER;
  });
  const [copiedPin, setCopiedPin] = useState<boolean>(false);
  const [copiedDonationField, setCopiedDonationField] = useState<'iban' | 'account' | 'whatsapp' | null>(null);
  const [isSendingPin, setIsSendingPin] = useState(false);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleCopyText = (text: string, field: 'iban' | 'account' | 'whatsapp') => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedDonationField(field);
    setTimeout(() => setCopiedDonationField(null), 2000);
  };

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const [rememberMe, setRememberMe] = useState(false);

  // Error and feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [halaqat, setHalaqat] = useState<HalaqahClass[]>([]);

  // List of surahs ordered backwards starting from Surah An-Nas (114) up to Al-Fatihah (1)
  const surahsFromAnNas = [...SURAH_LIST].reverse();
  const surahsFromAlBaqarah = [...SURAH_LIST];

  useEffect(() => {
    const list = getHalaqat();
    setHalaqat(list);
    if (list.length > 0) {
      setTeacherRegHalaqahId(list[0].id);
      setStudentRegHalaqahId(list[0].id);
    }
  }, []);

  // Listen for storage changes in real-time
  useEffect(() => {
    const handleDataUpdate = () => {
      const list = getHalaqat();
      setHalaqat(list);
      const s = getAdminSettings();
      if (s.officialSenderPhone && s.officialSenderPhone !== '0555555555') {
        setOfficialSenderPhone(s.officialSenderPhone);
      }
      if (list.length > 0 && !teacherRegHalaqahId) {
        setTeacherRegHalaqahId(list[0].id);
        setStudentRegHalaqahId(list[0].id);
      }
    };
    window.addEventListener('tahfeeth_data_updated', handleDataUpdate);
    return () => window.removeEventListener('tahfeeth_data_updated', handleDataUpdate);
  }, [teacherRegHalaqahId]);

  // 1. Teacher Submit (Login / Register)
  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const email = teacherLoginEmail.trim().toLowerCase();
    const pass = toEnglishDigits(teacherLoginPassword).trim();

    if (!email) {
      setErrorMessage('يرجى إدخال البريد الإلكتروني للمعلم أو رقم الجوال');
      return;
    }
    if (!pass) {
      setErrorMessage('يرجى إدخال كلمة المرور المعتمدة للمعلم');
      return;
    }

    if (pass !== TEACHER_GLOBAL_PASSWORD) {
      setErrorMessage('كلمة المرور غير صحيحة. يرجى إدخال كلمة المرور المعتمدة للمعلم.');
      return;
    }

    const matchedTeacher = findTeacherByEmail(email, pass);
    if (!matchedTeacher) {
      const teachers = getTeachers();
      const byEmail = teachers.find(
        (t) => (t.email && t.email.toLowerCase() === email) || t.phoneNumber === email
      );
      if (byEmail && pass === TEACHER_GLOBAL_PASSWORD) {
        onLoginSuccess('teacher', undefined, byEmail, rememberMe);
        return;
      }
      setErrorMessage('البريد الإلكتروني للمعلم غير مسجل. يرجى التحقق من البريد أو إنشاء حساب معلم جديد.');
      return;
    }

    onLoginSuccess('teacher', undefined, matchedTeacher, rememberMe);
  };

  const handleTeacherRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (halaqat.length === 0) {
      setErrorMessage('لا توجد حلقات مضافة حالياً في النظام. يجب على إدارة المجمع إنشاء حلقة أولاً.');
      return;
    }

    if (!teacherRegName.trim() || teacherRegName.trim().length < 3) {
      setErrorMessage('يرجى إدخال اسم المعلم كاملاً');
      return;
    }
    if (!teacherRegEmail.trim() || !teacherRegEmail.includes('@')) {
      setErrorMessage('يرجى إدخال بريد إلكتروني صحيح للمعلم');
      return;
    }
    const teacherPhoneVal = validateSaudiMobile(teacherRegPhone);
    if (!teacherPhoneVal.isValid) {
      setErrorMessage(teacherPhoneVal.error || 'رقم جوال المعلم غير صحيح: يجب أن يتكون من 10 أرقام ويبدأ بـ 05');
      return;
    }
    const pass = toEnglishDigits(teacherRegPassword).trim();
    if (!pass || pass !== TEACHER_GLOBAL_PASSWORD) {
      setErrorMessage('كلمة المرور غير صحيحة. يرجى إدخال كلمة المرور المعتمدة للمعلم.');
      return;
    }

    if (isPasswordUsedByStudent(pass)) {
      setErrorMessage('لا يمكن للمعلم استخدام كلمة مرور مستخدمة من قبل الطلاب. يرجى اختيار كلمة مرور أخرى خاصة بالمعلمين.');
      return;
    }

    const selectedHalaqah = halaqat.find((h) => h.id === teacherRegHalaqahId) || halaqat[0];

    const newTeacherPayload: TeacherProfile = {
      id: 'teacher_' + Date.now(),
      name: teacherRegName.trim(),
      email: teacherRegEmail.trim().toLowerCase(),
      phoneNumber: teacherPhoneVal.formattedLocal,
      passwordPin: TEACHER_GLOBAL_PASSWORD,
      halaqahId: selectedHalaqah ? selectedHalaqah.id : 'custom_' + Date.now(),
      halaqahName: selectedHalaqah ? selectedHalaqah.name : 'حلقة عامة',
      createdAt: new Date().toISOString(),
    };

    saveTeacher(newTeacherPayload);
    onLoginSuccess('teacher', undefined, newTeacherPayload, rememberMe);
  };

  // 2. Admin Submit
  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (adminPassword !== ADMIN_GLOBAL_PASSWORD) {
      setErrorMessage('كلمة مرور الإدارة غير صحيحة. يرجى التحقق والمحاولة مجدداً.');
      return;
    }

    onLoginSuccess('admin', undefined, undefined, rememberMe);
  };

  // 3. Student Submit (Login / Register)
  const handleStudentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const email = studentLoginEmail.trim().toLowerCase();
    const pass = toEnglishDigits(studentLoginPassword).trim();

    if (!email) {
      setErrorMessage('يرجى إدخال البريد الإلكتروني الخاص بالطالب');
      return;
    }

    // Check if user entered phone number instead of email
    if (/^05\d+$/.test(email) || /^\d+$/.test(email)) {
      setErrorMessage('تسجيل الدخول مخصص بالبريد الإلكتروني فقط، يرجى كتابة البريد الإلكتروني للطالب وليس رقم الجوال');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      setErrorMessage('صيغة البريد الإلكتروني غير صحيحة، يرجى إدخال بريد إلكتروني صحيح (مثال: student@example.com)');
      return;
    }

    if (!pass) {
      setErrorMessage('يرجى إدخال كلمة المرور (8 أرقام)');
      return;
    }

    if (pass.length !== 8 || !/^\d{8}$/.test(pass)) {
      setErrorMessage('كلمة مرور الطالب يجب أن تتكون من 8 أرقام فقط (مثال: 12345678)');
      return;
    }

    const matchedStudent = findStudentByEmail(email, pass);
    if (!matchedStudent) {
      setErrorMessage('لم يتم العثور على طالب مطابق للبريد الإلكتروني وكلمة المرور المدخلة.');
      return;
    }

    onLoginSuccess('student', matchedStudent, undefined, rememberMe);
  };

  const handleStudentRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (halaqat.length === 0) {
      setErrorMessage('لا توجد حلقات مضافة حالياً في النظام. يجب على إدارة المجمع أولاً إنشاء حلقة عبر بوابة الإدارة لتتمكن من التسجيل.');
      return;
    }

    if (!studentRegName.trim() || studentRegName.trim().length < 3) {
      setErrorMessage('يرجى إدخال اسم الطالب كاملاً');
      return;
    }
    if (!studentRegEmail.trim() || !studentRegEmail.includes('@') || !studentRegEmail.includes('.')) {
      setErrorMessage('يرجى إدخال بريد إلكتروني صحيح للطالب (إلزامي)');
      return;
    }
    const cleanedEmail = studentRegEmail.trim().toLowerCase();

    if (!studentRegPhone.trim()) {
      setErrorMessage('يرجى إدخال رقم جوال ولي الأمر (إلزامي)');
      return;
    }
    const guardianPhoneVal = validateSaudiMobile(studentRegPhone);
    if (!guardianPhoneVal.isValid) {
      setErrorMessage(guardianPhoneVal.error || 'رقم جوال ولي الأمر غير صحيح: يجب أن يتكون من 10 أرقام ويبدأ بـ 05');
      return;
    }
    let formattedStudentPersonalPhone: string | undefined = undefined;
    if (studentPersonalPhone.trim()) {
      const studentPhoneVal = validateSaudiMobile(studentPersonalPhone);
      if (!studentPhoneVal.isValid) {
        setErrorMessage(studentPhoneVal.error || 'رقم جوال الطالب غير صحيح: يجب أن يتكون من 10 أرقام ويبدأ بـ 05');
        return;
      }
      formattedStudentPersonalPhone = studentPhoneVal.formattedLocal;
    }
    const cleanStudentPass = toEnglishDigits(studentRegPassword).replace(/\D/g, '').trim();
    if (!cleanStudentPass || cleanStudentPass.length !== 8) {
      setErrorMessage('يجب أن تتكون كلمة المرور للطالب من 8 أرقام فقط (مثال: 12345678)');
      return;
    }

    if (isPasswordUsedByTeacher(cleanStudentPass)) {
      setErrorMessage('لا يمكن للطالب استخدام كلمة مرور مستخدمة من قبل المعلمين. يرجى اختيار كلمة مرور أخرى خاصة بك.');
      return;
    }

    // Check if email already registered (if provided)
    const existing = getStudents();
    if (cleanedEmail && existing.some((s) => s.email && s.email.toLowerCase() === cleanedEmail)) {
      setErrorMessage('هذا البريد الإلكتروني مسجل مسبقاً. يرجى تسجيل الدخول مباشرة.');
      return;
    }

    // Validate age (required for all students)
    const parsedAge = parseInt(toEnglishDigits(studentRegAge).replace(/\D/g, ''), 10);
    if (!parsedAge || isNaN(parsedAge) || parsedAge < 4 || parsedAge > 120) {
      setErrorMessage('يرجى إدخال عمر الطالب بالسنوات بشكل صحيح (مثال: 14).');
      return;
    }

    const selectedHalaqah = halaqat.find((h) => h.id === studentRegHalaqahId) || halaqat[0];
    const chosenSurahObj = SURAH_LIST.find((s) => s.number === studentRegLastSurahNumber);

    const newStudentPayload: Student = {
      id: 'student_' + Date.now(),
      fullName: studentRegName.trim(),
      email: cleanedEmail || '',
      passwordPin: studentRegPassword.trim(),
      rawPhoneNumber: guardianPhoneVal.formattedLocal,
      studentPhone: formattedStudentPersonalPhone,
      grade: studentRegGrade,
      gradeAssignedDate: new Date().toISOString(),
      age: parsedAge,
      ageAssignedDate: new Date().toISOString(),
      startSurah: studentRegStartSurah,
      lastSurahStoppedAt: chosenSurahObj ? chosenSurahObj.name : (studentRegStartSurah === 'al-nas' ? 'سورة الناس' : 'سورة الفاتحة'),
      lastSurahNumber: studentRegLastSurahNumber,
      registeredAt: new Date().toISOString(),
      currentSurahNumber: studentRegStartSurah === 'al-nas' ? Math.max(1, studentRegLastSurahNumber - 1) : Math.min(114, studentRegLastSurahNumber + 1),
      halaqahId: selectedHalaqah ? selectedHalaqah.id : 'general',
      halaqahName: selectedHalaqah ? selectedHalaqah.name : 'حلقة التحفيظ العامة',
    };

    saveStudent(newStudentPayload);
    onLoginSuccess('student', newStudentPayload, undefined, rememberMe);
  };

  // 4. Parent Login using Phone Number + Password (48201042)
  const handleParentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanPhone = toEnglishDigits(parentPhone).replace(/\D/g, '').trim();
    if (!cleanPhone.startsWith('05') || cleanPhone.length !== 10) {
      setErrorMessage('يجب أن يبدأ رقم الجوال بـ 05');
      return;
    }

    if (parentPassword.trim() !== '48201042') {
      setErrorMessage('كلمة المرور غير صحيحة');
      return;
    }

    const existing = findParentByPhone(cleanPhone);
    const parentProf: ParentProfile = {
      phoneNumber: cleanPhone,
      name: parentName.trim() || existing?.name || undefined,
      createdAt: existing?.createdAt || new Date().toISOString(),
    };

    saveParent(parentProf);
    onLoginSuccess('parent', undefined, undefined, rememberMe, cleanPhone, parentProf);
  };

  // 5. Send PIN to Parent via WhatsApp (legacy fallback)
  const handleSendWhatsAppPin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const validation = validateSaudiMobile(parentPhone);
    if (!validation.isValid) {
      setErrorMessage(validation.error || 'رقم غير صحيح: يجب أن يبدأ رقم الجوال بـ 05 ويتكون من 10 أرقام');
      return;
    }

    setIsSendingPin(true);
    try {
      const result = await sendParentWhatsappPin(validation.formattedLocal);
      if (!result.success || !result.pin) {
        setErrorMessage(result.error || 'تعذر إنشاء وإرسال رمز التحقق، يرجى المحاولة مرة أخرى');
        setIsSendingPin(false);
        return;
      }

      setSentPin(result.pin);
      setWhatsappChatUrl(result.whatsappUrl || null);
      setOfficialWhatsappUrl(result.officialWhatsappUrl || null);
      setParentWhatsappUrl(result.parentWhatsappUrl || null);
      if (result.officialSenderPhone) {
        setOfficialSenderPhone(result.officialSenderPhone);
      }

      // Open WhatsApp directly with pre-composed PIN message targeting parent's phone
      try {
        const targetUrl = result.parentWhatsappUrl || result.whatsappUrl || result.officialWhatsappUrl;
        if (targetUrl) {
          window.open(targetUrl, '_blank');
        }
      } catch (openErr) {
        console.log('Direct window open caught; fallback direct links are ready in UI');
      }

      setResendCooldown(60);
      setParentStep('pin');
      setParentPin('');
    } catch (err: any) {
      console.error('Error sending WhatsApp PIN:', err);
      setErrorMessage(err?.message || 'حدث خطأ أثناء إرسال رمز التحقق عبر واتساب');
    } finally {
      setIsSendingPin(false);
    }
  };

  // 5. Verify Parent PIN and Complete Login (Strict: cannot log in without correct PIN)
  const handleVerifyWhatsAppPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanPin = toEnglishDigits(parentPin).trim();
    if (!cleanPin || cleanPin.length !== 4) {
      setErrorMessage('يرجى إدخال رمز التحقق المكون من 4 أرقام كاملاً');
      return;
    }

    setIsVerifyingPin(true);
    try {
      const validation = validateSaudiMobile(parentPhone);
      const cleanPhone = validation.isValid ? validation.formattedLocal : parentPhone.replace(/\D/g, '');

      // Strict verification against generated PIN and Firestore
      const verifyResult = await verifyParentPinCode(cleanPhone, cleanPin, sentPin || undefined);

      if (!verifyResult.success) {
        setErrorMessage(verifyResult.error || 'رمز التحقق غير صحيح! يرجى التأكد من الرمز المكون من 4 أرقام المستلم في واتساب.');
        setIsVerifyingPin(false);
        return;
      }

      // Success: login is allowed
      const existing = findParentByPhone(cleanPhone);
      const parentProf: ParentProfile = {
        phoneNumber: cleanPhone,
        name: parentName.trim() || existing?.name || undefined,
        createdAt: existing?.createdAt || new Date().toISOString(),
      };

      saveParent(parentProf);
      onLoginSuccess('parent', undefined, undefined, rememberMe, cleanPhone, parentProf);
    } catch (err: any) {
      console.error('Error verifying PIN:', err);
      setErrorMessage('تعذر التحقق من الرمز، يرجى المحاولة مرة أخرى');
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const hasNoClasses = halaqat.length === 0;

  return (
    <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-start sm:justify-center p-2.5 sm:p-6 py-4 sm:py-10 overflow-y-auto" dir="rtl">
      {/* App Container Frame */}
      <div className="w-full max-w-md bg-stone-950 rounded-2xl sm:rounded-3xl border border-stone-800 shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Mosque Header Brand */}
        <div className="bg-gradient-to-b from-emerald-900/90 to-stone-950 p-4 sm:p-7 text-center border-b border-stone-800">
          {selectedRole && (
            <div className="flex items-center justify-between mb-3 sm:mb-4 pb-2 sm:pb-2.5 border-b border-white/10">
              <span className="text-xs text-emerald-300 font-bold">بوابة جامع الوالدين</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedRole(null);
                  setErrorMessage(null);
                }}
                className="text-stone-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 bg-stone-900/90 border border-stone-700 px-2.5 sm:px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <span>تغيير البوابة</span>
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              </button>
            </div>
          )}

          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-emerald-700/30 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-2 sm:mb-2.5 shadow-inner">
            <BookOpen className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <h1 className="text-lg sm:text-2xl font-black text-white tracking-wide">
            جامع الوالدين
          </h1>
          <p className="text-[11px] sm:text-xs text-emerald-300/80 font-medium mt-1">
            نظام إدارة وتوثيق حلقات تحفيظ القرآن الكريم
          </p>
        </div>

        {/* Dynamic Body: Role Choice or Role Login Form */}
        <div className="p-4 sm:p-7 space-y-5 sm:space-y-6">
          {/* Main 4 Options Selection */}
          {!selectedRole && (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-base font-bold text-stone-100">حدد نوع الحساب للمتابعة</h2>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-2">
                {/* 1. Student Option */}
                <button
                  onClick={() => {
                    setSelectedRole('student');
                    setErrorMessage(null);
                  }}
                  className="w-full text-right p-4 rounded-2xl bg-stone-900 border border-stone-800 hover:border-emerald-500/60 hover:bg-stone-850 transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-700/50 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                        1. بوابة الطالب
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-stone-500 group-hover:text-emerald-400 rotate-180 transition-colors" />
                </button>

                {/* 2. Parent Option */}
                <button
                  onClick={() => {
                    setSelectedRole('parent');
                    setParentStep('phone');
                    setErrorMessage(null);
                  }}
                  className="w-full text-right p-4 rounded-2xl bg-stone-900 border border-stone-800 hover:border-emerald-500/60 hover:bg-stone-850 transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-emerald-900/60 border border-emerald-600/50 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                        2. بوابة ولي الأمر
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-stone-500 group-hover:text-amber-400 rotate-180 transition-colors" />
                </button>

                {/* 3. Teacher Option */}
                <button
                  onClick={() => {
                    setSelectedRole('teacher');
                    setErrorMessage(null);
                  }}
                  className="w-full text-right p-4 rounded-2xl bg-stone-900 border border-stone-800 hover:border-teal-500/60 hover:bg-stone-850 transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-teal-950 border border-teal-700/50 text-teal-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <School className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors">
                        3. بوابة المعلم
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-stone-500 group-hover:text-teal-400 rotate-180 transition-colors" />
                </button>

                {/* 4. Admin Option */}
                <button
                  onClick={() => {
                    setSelectedRole('admin');
                    setErrorMessage(null);
                  }}
                  className="w-full text-right p-4 rounded-2xl bg-stone-900 border border-stone-800 hover:border-amber-500/60 hover:bg-stone-850 transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-amber-950 border border-amber-700/50 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Shield className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                        4. بوابة الإدارة
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-stone-500 group-hover:text-amber-400 rotate-180 transition-colors" />
                </button>
              </div>
            </div>
          )}

          {/* Parent Login Form with WhatsApp PIN Verification */}
          {selectedRole === 'parent' && (
            <div className="space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Step 1: Enter Phone & Password (48201042) */}
              <form onSubmit={handleParentLogin} className="space-y-3.5">
                {/* Phone input */}
                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-emerald-400" />
                      <span>رقم جوال ولي الأمر:</span>
                    </span>
                    {parentPhone.length > 0 && (
                      <span className="text-[11px] tabular-nums text-emerald-400 font-bold" dir="ltr">
                        {parentPhone.length} / 10
                      </span>
                    )}
                  </label>
                  <div>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={10}
                      value={parentPhone}
                      onChange={(e) => {
                        const digitsOnly = toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 10);
                        setParentPhone(digitsOnly);
                        setErrorMessage(null);
                      }}
                      onKeyDown={(e) => {
                        if (
                          !/[0-9]/.test(e.key) &&
                          !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key)
                        ) {
                          e.preventDefault();
                        }
                      }}
                      placeholder="05XXXXXXXX"
                      className={`w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border text-white placeholder-stone-500 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors ${
                        parentPhone.length >= 2 && !parentPhone.startsWith('05')
                          ? 'border-red-500/80 focus:ring-red-500/50 focus:border-red-500'
                          : 'border-stone-700'
                      }`}
                      required
                      dir="ltr"
                      autoFocus
                    />
                  </div>

                  {/* Inline real-time validation error if not starting with 05 */}
                  {parentPhone.length >= 2 && !parentPhone.startsWith('05') && (
                    <p className="text-[11px] text-amber-400 font-bold mt-1">
                      ⚠️ يجب أن يبدأ رقم الجوال بـ 05
                    </p>
                  )}
                </div>

                {/* Optional Parent Name */}
                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-emerald-400" />
                    <span>اسم ولي الأمر (اختياري):</span>
                  </label>
                  <input
                    type="text"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    placeholder="مثال: أبو محمد، خالد العمري..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-white placeholder-stone-500 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                {/* Password input */}
                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1 flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-emerald-400" />
                    <span>كلمة المرور:</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showParentPass ? 'text' : 'password'}
                      value={parentPassword}
                      onChange={(e) => {
                        setParentPassword(e.target.value);
                        setErrorMessage(null);
                      }}
                      placeholder="أدخل كلمة المرور المعتمدة"
                      className="w-full px-3.5 py-2.5 pl-10 rounded-xl bg-stone-900 border border-stone-700 text-white placeholder-stone-500 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 tracking-wider"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowParentPass(!showParentPass)}
                      className="absolute left-3 top-3 text-stone-500 hover:text-stone-300 cursor-pointer"
                      title={showParentPass ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    >
                      {showParentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-stone-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded-md border-stone-700 bg-stone-900 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-stone-950 cursor-pointer"
                    />
                    <span>تذكر تسجيل الدخول على هذا الجهاز</span>
                  </label>
                </div>

                {/* Submit button - Exactly matches Teacher & Student style */}
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  <span>دخول لوحة ولي الأمر</span>
                </button>
              </form>
            </div>
          )}

          {/* Teacher Login / Register Form */}
          {selectedRole === 'teacher' && (
            <div className="space-y-4">
              {/* Toggle Login / Register */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-900 rounded-xl border border-stone-800">
                <button
                  type="button"
                  onClick={() => {
                    setTeacherMode('login');
                    setErrorMessage(null);
                  }}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    teacherMode === 'login'
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  تسجيل الدخول
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTeacherMode('register');
                    setErrorMessage(null);
                  }}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    teacherMode === 'register'
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  حساب معلم جديد
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {teacherMode === 'login' ? (
                /* Teacher Login Form */
                <form onSubmit={handleTeacherLogin} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1 flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-teal-400" />
                      <span>البريد الإلكتروني للمعلم:</span>
                    </label>
                    <input
                      type="email"
                      value={teacherLoginEmail}
                      onChange={(e) => setTeacherLoginEmail(e.target.value)}
                      placeholder="teacher@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-white placeholder-stone-500 text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      required
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-teal-400" />
                      <span>كلمة المرور:</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showTeacherPass ? 'text' : 'password'}
                        value={teacherLoginPassword}
                        onChange={(e) => setTeacherLoginPassword(e.target.value)}
                        placeholder="أدخل كلمة المرور المعتمدة"
                        className="w-full px-3.5 py-2.5 pl-10 rounded-xl bg-stone-900 border border-stone-700 text-white placeholder-stone-500 text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowTeacherPass(!showTeacherPass)}
                        className="absolute left-3 top-3 text-stone-500 hover:text-stone-300 cursor-pointer"
                        title={showTeacherPass ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                      >
                        {showTeacherPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me Checkbox */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-stone-300 hover:text-white">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded-md border-stone-700 bg-stone-900 text-teal-600 focus:ring-teal-500 focus:ring-offset-stone-950 cursor-pointer"
                      />
                      <span>تذكر تسجيل الدخول على هذا الجهاز</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <School className="w-4 h-4" />
                    <span>دخول لوحة المعلم</span>
                  </button>
                </form>
              ) : (
                /* Teacher Register Form */
                <form onSubmit={handleTeacherRegister} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-teal-400" />
                      <span>اسم المعلم كاملاً:</span>
                    </label>
                    <input
                      type="text"
                      value={teacherRegName}
                      onChange={(e) => setTeacherRegName(e.target.value)}
                      placeholder="الشيخ / إبراهيم بن صالح..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-white placeholder-stone-500 text-xs focus:ring-2 focus:ring-teal-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1 flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-teal-400" />
                      <span>البريد الإلكتروني للمعلم:</span>
                    </label>
                    <input
                      type="email"
                      value={teacherRegEmail}
                      onChange={(e) => setTeacherRegEmail(e.target.value)}
                      placeholder="teacher@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-white placeholder-stone-500 text-xs focus:ring-2 focus:ring-teal-500"
                      required
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-4 h-4 text-teal-400" />
                        <span>رقم الجوال الشخصي للمعلم (إلزامي):</span>
                      </span>
                      {teacherRegPhone.length > 0 && (
                        <span className="text-[11px] tabular-nums text-teal-400 font-bold" dir="ltr">
                          {teacherRegPhone.length} / 10
                        </span>
                      )}
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={teacherRegPhone}
                      onChange={(e) => {
                        const digits = toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 10);
                        setTeacherRegPhone(digits);
                      }}
                      placeholder="05XXXXXXXX"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-white placeholder-stone-500 text-xs focus:ring-2 focus:ring-teal-500"
                      required
                      dir="ltr"
                    />
                    {teacherRegPhone.length >= 2 && !teacherRegPhone.startsWith('05') && (
                      <p className="text-[11px] text-amber-400 font-bold mt-1">
                        ⚠️ يجب أن يبدأ رقم الجوال بـ 05
                      </p>
                    )}
                    {teacherRegPhone.length === 10 && teacherRegPhone.startsWith('05') && (
                      <p className="text-[11px] text-teal-400 font-bold mt-1">
                        ✅ رقم جوال سعودي صحيح ومكتمل (10 أرقام)
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1">الحلقة التابعة للمعلم:</label>
                    <select
                      value={teacherRegHalaqahId}
                      onChange={(e) => setTeacherRegHalaqahId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-white text-xs focus:ring-2 focus:ring-teal-500"
                    >
                      {halaqat.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-teal-400" />
                      <span>كلمة المرور:</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showTeacherRegPass ? 'text' : 'password'}
                        value={teacherRegPassword}
                        onChange={(e) => setTeacherRegPassword(e.target.value)}
                        placeholder="أدخل كلمة المرور المعتمدة"
                        className="w-full px-3.5 py-2.5 pl-10 rounded-xl bg-stone-900 border border-stone-700 text-white placeholder-stone-500 text-xs focus:ring-2 focus:ring-teal-500 tracking-wider"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowTeacherRegPass(!showTeacherRegPass)}
                        className="absolute left-3 top-3 text-stone-500 hover:text-stone-300 cursor-pointer"
                        title={showTeacherRegPass ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                      >
                        {showTeacherRegPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me Checkbox */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-stone-300 hover:text-white">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded-md border-stone-700 bg-stone-900 text-teal-600 focus:ring-teal-500 focus:ring-offset-stone-950 cursor-pointer"
                      />
                      <span>تذكر تسجيل الدخول على هذا الجهاز</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <School className="w-4 h-4" />
                    <span>إنشاء حساب المعلم والدخول مباشرة</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Admin Login Form */}
          {selectedRole === 'admin' && (
            <div className="space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleAdminSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1 flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span>كلمة المرور:</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showAdminPass ? 'text' : 'password'}
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="أدخل كلمة المرور المعتمدة"
                      className="w-full px-3.5 py-2.5 pl-10 rounded-xl bg-stone-900 border border-stone-700 text-white placeholder-stone-500 text-xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500 tracking-wider"
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPass(!showAdminPass)}
                      className="absolute left-3 top-3 text-stone-500 hover:text-stone-300 cursor-pointer"
                      title={showAdminPass ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    >
                      {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-stone-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded-md border-stone-700 bg-stone-900 text-amber-600 focus:ring-amber-500 focus:ring-offset-stone-950 cursor-pointer"
                    />
                    <span>تذكر تسجيل الدخول على هذا الجهاز</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-amber-700 hover:bg-amber-600 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Shield className="w-4 h-4" />
                  <span>دخول لوحة الإدارة</span>
                </button>
              </form>
            </div>
          )}

          {/* Student Login / Register Form */}
          {selectedRole === 'student' && (
            <div className="space-y-4">
              {/* Toggle Login / Register */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-900 rounded-xl border border-stone-800">
                <button
                  type="button"
                  onClick={() => {
                    setStudentMode('login');
                    setErrorMessage(null);
                  }}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    studentMode === 'login'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  تسجيل الدخول
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStudentMode('register');
                    setErrorMessage(null);
                  }}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    studentMode === 'register'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  تسجيل طالب جديد
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {studentMode === 'login' ? (
                /* Student Login Form */
                <form onSubmit={handleStudentLogin} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1 flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-emerald-400" />
                      <span>البريد الإلكتروني للطالب:</span>
                    </label>
                    <input
                      type="email"
                      value={studentLoginEmail}
                      onChange={(e) => setStudentLoginEmail(e.target.value)}
                      placeholder="student@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-white placeholder-stone-500 text-xs focus:ring-2 focus:ring-emerald-500 text-left"
                      required
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-emerald-400" />
                        <span>كلمة المرور الخاصة بالطالب:</span>
                      </span>
                      {studentLoginPassword.length > 0 && (
                        <span className="text-[11px] tabular-nums text-emerald-400 font-bold" dir="ltr">
                          {studentLoginPassword.length} / 8
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type={showStudentPass ? 'text' : 'password'}
                        inputMode="numeric"
                        maxLength={8}
                        pattern="[0-9]*"
                        value={studentLoginPassword}
                        onChange={(e) => {
                          const digits = toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 8);
                          setStudentLoginPassword(digits);
                        }}
                        placeholder="أدخل 8 أرقام (مثال: 12345678)"
                        className="w-full px-3.5 py-2.5 pl-10 rounded-xl bg-stone-900 border border-stone-700 text-white placeholder-stone-500 text-xs focus:ring-2 focus:ring-emerald-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowStudentPass(!showStudentPass)}
                        className="absolute left-3 top-3 text-stone-500 hover:text-stone-300 cursor-pointer"
                        title={showStudentPass ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                      >
                        {showStudentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me Checkbox */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-stone-300 hover:text-white">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded-md border-stone-700 bg-stone-900 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-stone-950 cursor-pointer"
                      />
                      <span>تذكر تسجيل الدخول على هذا الجهاز</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>دخول لوحة الطالب</span>
                  </button>
                </form>
              ) : (
                /* Student Register Form */
                <form onSubmit={handleStudentRegister} className="space-y-3">
                  {hasNoClasses && (
                    <div className="p-3.5 rounded-xl bg-amber-950/80 border border-amber-700 text-amber-200 text-xs flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                      <div>
                        <strong>تنبيه: لا توجد حلقات مضافة حالياً في النظام.</strong>
                        <p className="mt-0.5 text-[11px] text-amber-300/80">
                          يجب على إدارة المجمع أولاً إنشاء حلقة عبر بوابة الإدارة لتتمكن من التسجيل والانضمام.
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-emerald-400" />
                      <span>اسم الطالب الرباعي:</span>
                    </label>
                    <input
                      type="text"
                      value={studentRegName}
                      onChange={(e) => setStudentRegName(e.target.value)}
                      placeholder="مثال: عبدالله بن أحمد بن محمد الغامدي"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-white placeholder-stone-500 text-xs focus:ring-2 focus:ring-emerald-500"
                      required
                      disabled={hasNoClasses}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-emerald-400" />
                        <span>البريد الإلكتروني للطالب (إلزامي):</span>
                      </span>
                    </label>
                    <input
                      type="email"
                      value={studentRegEmail}
                      onChange={(e) => setStudentRegEmail(e.target.value)}
                      placeholder="student@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-white placeholder-stone-500 text-xs focus:ring-2 focus:ring-emerald-500"
                      dir="ltr"
                      required
                      disabled={hasNoClasses}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-4 h-4 text-emerald-400" />
                        <span>رقم جوال ولي الأمر (إلزامي):</span>
                      </span>
                      {studentRegPhone.length > 0 && (
                        <span className="text-[11px] tabular-nums text-emerald-400 font-bold" dir="ltr">
                          {studentRegPhone.length} / 10
                        </span>
                      )}
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={studentRegPhone}
                      onChange={(e) => {
                        const digits = toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 10);
                        setStudentRegPhone(digits);
                      }}
                      placeholder="05XXXXXXXX"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-white placeholder-stone-500 text-xs focus:ring-2 focus:ring-emerald-500"
                      required
                      dir="ltr"
                      disabled={hasNoClasses}
                    />
                    {studentRegPhone.length >= 2 && !studentRegPhone.startsWith('05') && (
                      <p className="text-[11px] text-amber-400 font-bold mt-1">
                        ⚠️ يجب أن يبدأ رقم الجوال بـ 05
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-4 h-4 text-teal-400" />
                        <span>رقم جوال الطالب الخاص:</span>
                      </span>
                      {studentPersonalPhone.length > 0 && (
                        <span className="text-[11px] tabular-nums text-teal-400 font-bold" dir="ltr">
                          {studentPersonalPhone.length} / 10
                        </span>
                      )}
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={studentPersonalPhone}
                      onChange={(e) => {
                        const digits = toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 10);
                        setStudentPersonalPhone(digits);
                      }}
                      placeholder="05XXXXXXXX"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-white placeholder-stone-500 text-xs focus:ring-2 focus:ring-teal-500"
                      dir="ltr"
                      disabled={hasNoClasses}
                    />
                    {studentPersonalPhone.length >= 2 && !studentPersonalPhone.startsWith('05') && (
                      <p className="text-[11px] text-amber-400 font-bold mt-1">
                        ⚠️ يجب أن يبدأ رقم الجوال بـ 05
                      </p>
                    )}
                  </div>

                  {/* Student Stage Field (مرحلة المسجل) */}
                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1 flex items-center gap-1.5">
                      <School className="w-4 h-4 text-emerald-400" />
                      <span>مرحلة المسجل:</span>
                    </label>
                    <select
                      value={studentRegGrade}
                      onChange={(e) => setStudentRegGrade(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-white text-xs focus:ring-2 focus:ring-emerald-500 font-bold"
                      disabled={hasNoClasses}
                    >
                      {GRADES_LIST.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Student Age Field */}
                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-emerald-400" />
                      <span>عمر الطالب (بالسنوات):</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={studentRegAge}
                      onChange={(e) => {
                        const val = toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 3);
                        setStudentRegAge(val);
                      }}
                      placeholder="أدخل عمر الطالب (مثال: 14)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-white placeholder-stone-400 text-xs focus:ring-2 focus:ring-emerald-500 font-medium"
                      required
                      disabled={hasNoClasses}
                    />
                  </div>

                  {/* Which Surah Started At: An-Nas vs Al-Fatihah */}
                  <div className="p-3 rounded-2xl bg-stone-900 border border-stone-800 space-y-2">
                    <label className="block text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-emerald-400" />
                      <span>من أي سورة بدأت الحفظ في مسيرتك؟</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setStudentRegStartSurah('al-nas');
                          setStudentRegLastSurahNumber(67); // default to Al-Mulk
                        }}
                        className={`p-2.5 rounded-xl border text-xs text-right transition-all cursor-pointer flex items-center justify-between ${
                          studentRegStartSurah === 'al-nas'
                            ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500'
                            : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        <span className="font-bold text-xs flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${studentRegStartSurah === 'al-nas' ? 'bg-emerald-400' : 'bg-stone-600'}`} />
                          من سورة الناس
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setStudentRegStartSurah('al-baqarah');
                          setStudentRegLastSurahNumber(1); // default to Al-Fatihah
                        }}
                        className={`p-2.5 rounded-xl border text-xs text-right transition-all cursor-pointer flex items-center justify-between ${
                          studentRegStartSurah === 'al-baqarah'
                            ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500'
                            : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        <span className="font-bold text-xs flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${studentRegStartSurah === 'al-baqarah' ? 'bg-emerald-400' : 'bg-stone-600'}`} />
                          من سورة الفاتحة
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Last Surah Stopped At field (Dynamic based on startSurah) */}
                  <div className="p-3 rounded-2xl bg-stone-900 border border-stone-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-emerald-300">
                        آخر سورة توقفت عندها في الحفظ / تحفظ فيها الآن:
                      </label>
                    </div>
                    <select
                      value={studentRegLastSurahNumber}
                      onChange={(e) => setStudentRegLastSurahNumber(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-white text-xs font-bold focus:ring-2 focus:ring-emerald-500"
                      disabled={hasNoClasses}
                    >
                      {studentRegStartSurah === 'al-nas'
                        ? surahsFromAnNas.map((s) => (
                            <option key={s.number} value={s.number}>
                              سورة {s.name} ({s.number}) - {s.numberOfAyahs} آية
                            </option>
                          ))
                        : surahsFromAlBaqarah.map((s) => (
                            <option key={s.number} value={s.number}>
                              سورة {s.name} ({s.number}) - {s.numberOfAyahs} آية
                            </option>
                          ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1">الحلقة / الفصل:</label>
                    <select
                      value={studentRegHalaqahId}
                      onChange={(e) => setStudentRegHalaqahId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-white text-xs focus:ring-2 focus:ring-emerald-500"
                      disabled={hasNoClasses}
                    >
                      {hasNoClasses ? (
                        <option value="">لا توجد حلقات حالياً</option>
                      ) : (
                        halaqat.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.name} {h.teacherName ? `(المعلم: ${h.teacherName})` : ''}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-emerald-400" />
                        <span>تعيين كلمة المرور الخاصة بالطالب:</span>
                      </span>
                      {studentRegPassword.length > 0 && (
                        <span className="text-[11px] tabular-nums text-emerald-400 font-bold" dir="ltr">
                          {studentRegPassword.length} / 8
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type={showStudentRegPass ? 'text' : 'password'}
                        inputMode="numeric"
                        maxLength={8}
                        pattern="[0-9]*"
                        value={studentRegPassword}
                        onChange={(e) => {
                          const digits = toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 8);
                          setStudentRegPassword(digits);
                        }}
                        placeholder="أدخل 8 أرقام (مثال: 12345678)"
                        className="w-full px-3.5 py-2.5 pl-10 rounded-xl bg-stone-900 border border-stone-700 text-white placeholder-stone-500 text-xs focus:ring-2 focus:ring-emerald-500"
                        required
                        disabled={hasNoClasses}
                      />
                      <button
                        type="button"
                        onClick={() => setShowStudentRegPass(!showStudentRegPass)}
                        className="absolute left-3 top-3 text-stone-500 hover:text-stone-300 cursor-pointer"
                        title={showStudentRegPass ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                      >
                        {showStudentRegPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {studentRegPassword.length > 0 && studentRegPassword.length < 8 && (
                      <p className="text-[11px] text-amber-400 font-bold mt-1">
                        ⚠️ كلمة مرور الطالب يجب أن تتكون من 8 أرقام تماماً ({studentRegPassword.length} من 8)
                      </p>
                    )}
                    {studentRegPassword.length === 8 && (
                      <p className="text-[11px] text-emerald-400 font-bold mt-1">
                        كلمة مرور الطالب مكتملة وصحيحة (8 أرقام)
                      </p>
                    )}
                  </div>

                  {/* Remember Me Checkbox */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-stone-300 hover:text-white">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded-md border-stone-700 bg-stone-900 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-stone-950 cursor-pointer"
                      />
                      <span>تذكر تسجيل الدخول على هذا الجهاز</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={hasNoClasses}
                    className={`w-full py-3 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      hasNoClasses
                        ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                        : 'bg-emerald-700 hover:bg-emerald-600 text-white'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>تسجيل الطالب والدخول مباشرة</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Home Screen Only: Donation & WhatsApp Section */}
        {!selectedRole && (
          <div className="bg-gradient-to-b from-emerald-900/35 via-stone-900/85 to-stone-900/90 border-t border-stone-700/80 py-4 relative overflow-hidden select-none space-y-3.5">
            {/* 1. التبرع لحلقات جامع الوالدين */}
            <div className="space-y-1.5 relative">
              <div className="text-center px-4 flex items-center justify-center gap-2">
                <span className="text-xs sm:text-sm font-black text-emerald-300 tracking-wide">
                  التبرع لحلقات جامع الوالدين
                </span>
                {copiedDonationField === 'iban' && (
                  <span className="text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>تم النسخ</span>
                  </span>
                )}
              </div>

              {/* Edge Fade Masks */}
              <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-stone-900 to-transparent z-10" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-stone-900 to-transparent z-10" />

              {/* Left-to-Right Scrolling IBAN Only (Click to Copy, Lighter Teacher Teal-Blue on Hover) */}
              <div dir="ltr" className="overflow-hidden w-full">
                <button
                  type="button"
                  onClick={() =>
                    handleCopyText('SA 57 80000 110 6080 1991 1293 110 6080 1991 1293', 'iban')
                  }
                  className="animate-marquee-ltr items-center cursor-pointer group py-1"
                  title="انقر للنسخ"
                >
                  {[0, 1].map((dupIndex) => (
                    <div
                      key={dupIndex}
                      className="flex items-center gap-4 px-2 shrink-0 text-amber-300 group-hover:text-teal-300 hover:text-teal-300 font-black text-xs sm:text-sm tracking-wider transition-colors"
                    >
                      <span>SA 57 80000 110 6080 1991 1293 110 6080 1991 1293</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 shrink-0" />
                      <span>SA 57 80000 110 6080 1991 1293 110 6080 1991 1293</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 shrink-0" />
                    </div>
                  ))}
                </button>
              </div>
            </div>

            {/* 2. تواصل مع حلقات جامع الوالدين */}
            <div className="pt-2.5 border-t border-stone-700/60 space-y-1.5 relative">
              <div className="text-center px-4 flex items-center justify-center gap-2">
                <span className="text-xs sm:text-sm font-black text-emerald-300 tracking-wide">
                  تواصل مع حلقات جامع الوالدين
                </span>
                {copiedDonationField === 'whatsapp' && (
                  <span className="text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>تم النسخ</span>
                  </span>
                )}
              </div>

              {/* Edge Fade Masks */}
              <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-stone-900 to-transparent z-10" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-stone-900 to-transparent z-10" />

              {/* Left-to-Right Scrolling WhatsApp Number Only (Click to Copy, Lighter Teacher Teal-Blue on Hover) */}
              <div dir="ltr" className="overflow-hidden w-full">
                <button
                  type="button"
                  onClick={() => handleCopyText('+966507734083', 'whatsapp')}
                  className="animate-marquee-ltr items-center cursor-pointer group py-1"
                  title="انقر لنسخ رقم الواتساب"
                >
                  {[0, 1].map((dupIndex) => (
                    <div
                      key={dupIndex}
                      className="flex items-center gap-4 px-2 shrink-0 text-amber-300 group-hover:text-teal-300 hover:text-teal-300 font-black text-xs sm:text-sm tracking-wider transition-colors"
                    >
                      <span>+966507734083</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 shrink-0" />
                      <span>+966507734083</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 shrink-0" />
                      <span>+966507734083</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 shrink-0" />
                      <span>+966507734083</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 shrink-0" />
                    </div>
                  ))}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div className="bg-stone-900/60 p-3.5 text-center border-t border-stone-800 text-[11px] text-stone-400 space-y-1">
          <div>برنامج تحفيظ القرآن الكريم — جامع الوالدين</div>
          <div className="text-[10px] text-stone-500">
            تزامن سحابي فوري وحفظ البيانات عبر جميع الأجهزة
          </div>
        </div>
      </div>
    </div>
  );
};
