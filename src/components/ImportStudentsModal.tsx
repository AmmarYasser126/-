import React, { useState, useRef } from 'react';
import { Student, HalaqahClass } from '../types';
import { saveStudent, getStudents, isPasswordUsedByTeacher } from '../utils/storage';
import { GRADES_LIST } from '../utils/gradeHelper';
import { SURAH_LIST } from '../data/quranData';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Download,
  FileText,
  Users,
  Info,
} from 'lucide-react';

interface ImportStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  halaqat: HalaqahClass[];
  onImportSuccess: () => void;
}

interface ParsedStudentRow {
  fullName: string;
  email?: string;
  rawPhoneNumber: string;
  passwordPin: string;
  grade: string;
  startSurah: 'al-nas' | 'al-baqarah';
  lastSurahNumber: number;
  lastSurahStoppedAt: string;
  halaqahName: string;
  isValid: boolean;
  errorMessage?: string;
}

export const ImportStudentsModal: React.FC<ImportStudentsModalProps> = ({
  isOpen,
  onClose,
  halaqat,
  onImportSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const defaultHalaqahName = halaqat[0]?.name || 'حلقة عامة';

  const parseSurahValue = (val: string, startSurah: 'al-nas' | 'al-baqarah') => {
    if (!val) return startSurah === 'al-nas' ? { num: 67, name: 'الملك' } : { num: 1, name: 'الفاتحة' };
    const clean = val.trim().replace(/^سورة\s+/, '');
    const num = parseInt(clean, 10);
    if (!isNaN(num) && num >= 1 && num <= 114) {
      const match = SURAH_LIST.find((s) => s.number === num);
      return { num, name: match ? match.name : `سورة ${num}` };
    }
    const found = SURAH_LIST.find(
      (s) => s.name === clean || s.name.includes(clean) || clean.includes(s.name)
    );
    if (found) {
      return { num: found.number, name: found.name };
    }
    return startSurah === 'al-nas' ? { num: 67, name: 'الملك' } : { num: 1, name: 'الفاتحة' };
  };

  const processContent = (text: string) => {
    setGlobalError(null);
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      setGlobalError('الملف أو النص المدخل فارغ.');
      setParsedRows([]);
      return;
    }

    const existingStudents = getStudents();
    const rows: ParsedStudentRow[] = [];

    // Check if line 0 is a header
    let startIndex = 0;
    const headerCheck = lines[0].toLowerCase();
    if (
      headerCheck.includes('اسم') ||
      headerCheck.includes('name') ||
      headerCheck.includes('جوال') ||
      headerCheck.includes('phone')
    ) {
      startIndex = 1;
    }

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      // Delimiters: comma, tab, or semicolon
      const parts = line.split(/[,\t;]/).map((p) => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length < 2) continue;

      const name = parts[0] || '';
      const phone = parts[1] || '';
      const email = parts[2] || '';
      const pin = parts[3] || '123456';
      const grade = parts[4] || GRADES_LIST[0];
      const startSurahRaw = (parts[5] || '').toLowerCase();
      const startSurah: 'al-nas' | 'al-baqarah' =
        startSurahRaw.includes('فاتحة') || startSurahRaw.includes('fatihah') || startSurahRaw.includes('بقرة') || startSurahRaw.includes('baqarah') || startSurahRaw === '1' || startSurahRaw === '2'
          ? 'al-baqarah'
          : 'al-nas';
      const lastSurahRaw = parts[6] || (startSurah === 'al-nas' ? '67' : '1');
      const { num: surahNum, name: surahName } = parseSurahValue(lastSurahRaw, startSurah);
      const halaqah = parts[7] || defaultHalaqahName;

      let isValid = true;
      let errorMessage: string | undefined;

      if (!name || name.length < 3) {
        isValid = false;
        errorMessage = 'اسم الطالب غير مكتمل';
      } else if (!phone || phone.length < 8) {
        isValid = false;
        errorMessage = 'رقم الجوال غير صحيح';
      } else if (isPasswordUsedByTeacher(pin)) {
        isValid = false;
        errorMessage = 'كلمة المرور مستخدمة من قبل معلم';
      } else if (
        email &&
        existingStudents.some((s) => s.email && s.email.toLowerCase() === email.toLowerCase())
      ) {
        isValid = false;
        errorMessage = 'البريد الإلكتروني مسجل مسبقاً لطالب آخر';
      }

      rows.push({
        fullName: name,
        rawPhoneNumber: phone,
        email: email || undefined,
        passwordPin: pin,
        grade,
        startSurah,
        lastSurahNumber: surahNum,
        lastSurahStoppedAt: surahName,
        halaqahName: halaqah,
        isValid,
        errorMessage,
      });
    }

    if (rows.length === 0) {
      setGlobalError('لم نتمكن من قراءة أي سجلات صحيحة من البيانات المدخلة.');
    }
    setParsedRows(rows);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        processContent(content);
      }
    };
    reader.readAsText(uploadedFile, 'UTF-8');
  };

  const handleExecuteImport = () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setGlobalError('لا توجد سجلات صالحة للاستيراد.');
      return;
    }

    setIsProcessing(true);
    let count = 0;

    validRows.forEach((row, idx) => {
      const matchedHalaqah = halaqat.find(
        (h) => h.name === row.halaqahName || h.id === row.halaqahName
      );

      const newStudent: Student = {
        id: `student_imp_${Date.now()}_${idx}`,
        fullName: row.fullName,
        email: row.email,
        rawPhoneNumber: row.rawPhoneNumber,
        passwordPin: row.passwordPin,
        grade: row.grade,
        gradeAssignedDate: new Date().toISOString(),
        startSurah: row.startSurah,
        lastSurahStoppedAt: row.lastSurahStoppedAt,
        lastSurahNumber: row.lastSurahNumber,
        currentSurahNumber:
          row.startSurah === 'al-nas'
            ? Math.max(1, row.lastSurahNumber - 1)
            : Math.min(114, row.lastSurahNumber + 1),
        halaqahId: matchedHalaqah?.id || 'general',
        halaqahName: matchedHalaqah?.name || row.halaqahName,
        registeredAt: new Date().toISOString(),
      };

      saveStudent(newStudent);
      count++;
    });

    setIsProcessing(false);
    setSuccessCount(count);
    onImportSuccess();
    setTimeout(() => {
      onClose();
    }, 1800);
  };

  const handleDownloadSampleTemplate = () => {
    const sampleCsv = `الاسم,رقم الجوال,البريد الإلكتروني,كلمة المرور,الصف الدراسي,بداية الحفظ,آخر سورة توقف عندها,الحلقة
عبدالرحمن إبراهيم أحمد,0501112233,abdulrahman@example.com,pass1234,الصف الأول الابتدائي,سورة الناس,الملك,حلقة علي بن أبي طالب
محمد عبدالله القحطاني,0554443322,mohammed@example.com,pass5678,الصف الثاني المتوسط,سورة الفاتحة,آل عمران,حلقة عثمان بن عفان
سعد بن خالد العمري,0567778899,saad@example.com,pass9012,الصف الثالث الثانوي,سورة الناس,النبأ,حلقة أبي بكر الصديق`;

    const blob = new Blob(['\uFEFF' + sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'نموذج_استيراد_الطلاب_جامع_الوالدين.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto" dir="rtl">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-linear-to-r from-emerald-900 to-teal-900 p-5 sm:p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-700/50 border border-emerald-400/40 flex items-center justify-center text-emerald-200 shadow-inner">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black">استيراد بيانات وقوائم الطلاب</h3>
              <p className="text-xs text-emerald-200/80">
                إضافة جماعية للطلاب عبر ملف CSV / Excel أو اللصق المباشر بكل سهولة وتنظيم
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Quick Actions & Sample Template */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-2xl">
            <div className="flex items-center gap-2 text-xs text-emerald-900">
              <Info className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                يدعم الملف الحقول: (الاسم، الجوال، البريد، كلمة المرور، الصف، بداية الحفظ، آخر سورة، الحلقة)
              </span>
            </div>
            <button
              type="button"
              onClick={handleDownloadSampleTemplate}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تحميل نموذج CSV جاهز</span>
            </button>
          </div>

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-100 rounded-2xl border border-stone-200">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>رفع ملف CSV / Excel</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('paste')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'paste'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>لصق بيانات نصية</span>
            </button>
          </div>

          {activeTab === 'upload' ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-3xl p-8 text-center cursor-pointer bg-emerald-50/30 hover:bg-emerald-50/60 transition-all space-y-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-stone-800">
                {file ? file.name : 'اضغط لاختيار ملف الطلاب (CSV)'}
              </div>
              <p className="text-xs text-stone-500">
                يمكنك تصدير الكشف من Excel بصيغة CSV ورفعه مباشرة هنا
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-700">
                الصق سطور الطلاب هنا (القيم مفصولة بفواصل أو مسافات جدولة):
              </label>
              <textarea
                value={pastedText}
                onChange={(e) => {
                  setPastedText(e.target.value);
                  processContent(e.target.value);
                }}
                rows={5}
                placeholder="الاسم,رقم الجوال,البريد,كلمة المرور,الصف,سورة الناس,الملك,حلقة علي بن أبي طالب"
                className="w-full p-3 rounded-2xl border border-stone-300 text-xs bg-stone-50 text-stone-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                dir="auto"
              />
            </div>
          )}

          {/* Feedback messages */}
          {globalError && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{globalError}</span>
            </div>
          )}

          {successCount !== null && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>تم بنجاح استيراد {successCount} طالباً وتحديث النظام!</span>
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-stone-800 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-700" />
                  <span>معاينة الطلاب المكتشفين ({parsedRows.length} طالب):</span>
                </span>
                <span className="text-[11px] text-emerald-700 font-semibold">
                  جاهز للاستيراد: {parsedRows.filter((r) => r.isValid).length} / {parsedRows.length}
                </span>
              </div>

              <div className="max-h-56 overflow-y-auto border border-stone-200 rounded-2xl divide-y divide-stone-100 text-xs">
                {parsedRows.map((row, idx) => (
                  <div
                    key={idx}
                    className={`p-3 flex items-center justify-between gap-2 ${
                      row.isValid ? 'bg-white hover:bg-stone-50' : 'bg-rose-50/50'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-stone-900 flex items-center gap-1.5">
                        <span>{row.fullName}</span>
                        {row.isValid ? (
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-medium">
                            صالح
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-medium">
                            {row.errorMessage}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-stone-500 flex flex-wrap gap-2">
                        <span>الجوال: {row.rawPhoneNumber}</span>
                        {row.email && <span>البريد: {row.email}</span>}
                        <span>الصف: {row.grade}</span>
                        <span>
                          البداية: {row.startSurah === 'al-nas' ? 'سورة الناس' : 'سورة الفاتحة'}
                        </span>
                        <span>آخر سورة: {row.lastSurahStoppedAt}</span>
                        <span>الحلقة: {row.halaqahName}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-stone-300 text-stone-600 hover:bg-stone-100 text-xs font-bold transition-colors cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            disabled={parsedRows.filter((r) => r.isValid).length === 0 || isProcessing}
            onClick={handleExecuteImport}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
              parsedRows.filter((r) => r.isValid).length === 0 || isProcessing
                ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                : 'bg-emerald-700 hover:bg-emerald-600 text-white'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {isProcessing
                ? 'جاري الاستيراد...'
                : `تأكيد استيراد (${parsedRows.filter((r) => r.isValid).length}) طالب`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
