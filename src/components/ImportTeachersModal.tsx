import React, { useState, useRef } from 'react';
import { TeacherProfile, HalaqahClass } from '../types';
import { saveTeacher, getTeachers, saveHalaqah, getHalaqat, TEACHER_GLOBAL_PASSWORD } from '../utils/storage';
import { formatNumberEn } from '../utils/format';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Download,
  GraduationCap,
  Users,
  Info,
  Check,
  FileText,
} from 'lucide-react';

interface ImportTeachersModalProps {
  isOpen: boolean;
  onClose: () => void;
  halaqat: HalaqahClass[];
  onImportSuccess: () => void;
}

interface ParsedTeacherRow {
  name: string;
  phoneNumber: string;
  halaqahName: string;
  email?: string;
  passwordPin?: string;
  isValid: boolean;
  errorMessage?: string;
}

export const ImportTeachersModal: React.FC<ImportTeachersModalProps> = ({
  isOpen,
  onClose,
  halaqat,
  onImportSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedTeacherRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const defaultHalaqahName = halaqat[0]?.name || 'حلقة عامة';

  const processContent = (text: string) => {
    setGlobalError(null);
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      setGlobalError('الملف أو النص المدخل فارغ.');
      setParsedRows([]);
      return;
    }

    const existingTeachers = getTeachers();
    const rows: ParsedTeacherRow[] = [];
    const seenPhonesInBatch = new Set<string>();

    // Check if line 0 is a header
    let startIndex = 0;
    const headerCheck = lines[0].toLowerCase();
    if (
      headerCheck.includes('اسم') ||
      headerCheck.includes('معلم') ||
      headerCheck.includes('teacher') ||
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
      const halaqah = parts[2] || defaultHalaqahName;
      const email = parts[3] || '';
      const pin = parts[4] || TEACHER_GLOBAL_PASSWORD;

      let isValid = true;
      let errorMessage: string | undefined;

      const cleanPhone = phone.replace(/\D/g, '');

      if (!name || name.length < 3) {
        isValid = false;
        errorMessage = 'اسم المعلم غير مكتمل (أقل من 3 أحرف)';
      } else if (!phone || phone.length < 8) {
        isValid = false;
        errorMessage = 'رقم الجوال غير صحيح';
      } else if (seenPhonesInBatch.has(cleanPhone)) {
        isValid = false;
        errorMessage = 'رقم الجوال مكرر في نفس الملف';
      } else if (
        existingTeachers.some(
          (t) => t.phoneNumber && t.phoneNumber.replace(/\D/g, '') === cleanPhone
        )
      ) {
        isValid = false;
        errorMessage = 'رقم الجوال مسجل مسبقاً لمعلم آخر في النظام';
      } else if (
        email &&
        existingTeachers.some(
          (t) => t.email && t.email.trim().toLowerCase() === email.trim().toLowerCase()
        )
      ) {
        isValid = false;
        errorMessage = 'البريد الإلكتروني مسجل مسبقاً لمعلم آخر';
      }

      if (cleanPhone) {
        seenPhonesInBatch.add(cleanPhone);
      }

      rows.push({
        name,
        phoneNumber: phone,
        halaqahName: halaqah,
        email: email || undefined,
        passwordPin: pin,
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
    const currentHalaqat = getHalaqat();

    validRows.forEach((row, idx) => {
      let matchedHalaqah = currentHalaqat.find(
        (h) => h.name.trim().toLowerCase() === row.halaqahName.trim().toLowerCase()
      );

      // If halaqah doesn't exist, create it automatically
      if (!matchedHalaqah && row.halaqahName.trim()) {
        const newHalaqah: HalaqahClass = {
          id: `halaqah_auto_${Date.now()}_${idx}`,
          name: row.halaqahName.trim(),
          teacherName: row.name.trim(),
          teacherPhone: row.phoneNumber.trim(),
          teacherEmail: row.email,
          createdAt: new Date().toISOString(),
        };
        saveHalaqah(newHalaqah);
        matchedHalaqah = newHalaqah;
      }

      const newTeacher: TeacherProfile = {
        id: `teacher_imp_${Date.now()}_${idx}`,
        name: row.name.trim(),
        phoneNumber: row.phoneNumber.trim(),
        email: row.email?.trim() || undefined,
        passwordPin: row.passwordPin?.trim() || '123456',
        halaqahId: matchedHalaqah ? matchedHalaqah.id : `halaqah_${Date.now()}_${idx}`,
        halaqahName: row.halaqahName.trim(),
        createdAt: new Date().toISOString(),
      };

      saveTeacher(newTeacher);
      count++;
    });

    setIsProcessing(false);
    setSuccessCount(count);
    onImportSuccess();
  };

  const handleDownloadTemplate = () => {
    const header = 'اسم المعلم,رقم الجوال,الحلقة التابعة,البريد الإلكتروني,كلمة المرور\n';
    const sampleRows = [
      `الشيخ عبد الرحمن السديس,0501112233,حلقة النور,sudais@example.com,${TEACHER_GLOBAL_PASSWORD}`,
      `الشيخ ماهر المعيقلي,0504445566,حلقة الفرقان,maher@example.com,${TEACHER_GLOBAL_PASSWORD}`,
      `الشيخ سعود الشريم,0507778899,حلقة الفجر,shuraim@example.com,${TEACHER_GLOBAL_PASSWORD}`,
    ].join('\n');

    const csvContent = '\uFEFF' + header + sampleRows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'نموذج_استيراد_المعلمين.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in">
      <div
        className="bg-white max-w-2xl w-full rounded-3xl p-5 sm:p-6 shadow-2xl border border-stone-200 space-y-4 text-right relative max-h-[92vh] flex flex-col"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-stone-900">استيراد بيانات المعلمين</h3>
              <p className="text-xs text-stone-500">
                إضافة جماعية لمعلمي الحلقات عبر ملف CSV أو لصق البيانات المجدولة
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Modal View */}
        {successCount !== null ? (
          <div className="p-8 text-center space-y-4 my-auto">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-black text-stone-900">تم استيراد المعلمين بنجاح!</h4>
            <p className="text-xs text-stone-600 max-w-md mx-auto">
              تمت إضافة ({formatNumberEn(successCount)}) معلم بنجاح وتعيين حلقاتهم وحفظ بياناتهم في قاعدة البيانات.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              تم وإغلاق النافذة
            </button>
          </div>
        ) : (
          <>
            {/* Input Selection Tabs */}
            <div className="flex items-center justify-between gap-2 shrink-0">
              <div className="flex p-1 bg-stone-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('upload');
                    setParsedRows([]);
                    setGlobalError(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'upload'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  رفع ملف CSV / Excel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('paste');
                    setParsedRows([]);
                    setGlobalError(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'paste'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  لصق نص مباشر
                </button>
              </div>

              {/* Download CSV Template Button */}
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="تحميل نموذج تجريبي فارغ لملء بيانات المعلمين"
              >
                <Download className="w-3.5 h-3.5 text-amber-700" />
                <span>نموذج المعلمين (CSV)</span>
              </button>
            </div>

            {/* Upload Area */}
            {activeTab === 'upload' ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-stone-300 hover:border-amber-500 bg-stone-50 hover:bg-amber-50/40 rounded-2xl p-6 text-center cursor-pointer transition-all shrink-0"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt,.tsv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-white border border-stone-200 shadow-xs text-amber-700 flex items-center justify-center mx-auto mb-2">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-bold text-stone-800">
                  {file ? file.name : 'اضغط لاختيار ملف CSV أو أسقطه هنا'}
                </h4>
                <p className="text-[11px] text-stone-500 mt-1">
                  الملفات المدعومة: CSV، TXT بترميز UTF-8
                </p>
              </div>
            ) : (
              <div className="space-y-2 shrink-0">
                <textarea
                  value={pastedText}
                  onChange={(e) => {
                    setPastedText(e.target.value);
                    if (e.target.value.trim()) {
                      processContent(e.target.value);
                    } else {
                      setParsedRows([]);
                    }
                  }}
                  rows={4}
                  placeholder={`الصق بيانات المعلمين هنا (اسم المعلم، رقم الجوال، اسم الحلقة، البريد):\nالشيخ أحمد,0501112233,حلقة الفجر\nالشيخ عمر,0504445566,حلقة النور`}
                  className="w-full p-3 rounded-2xl border border-stone-300 bg-stone-50 text-xs text-stone-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}

            {/* Global Error Banner */}
            {globalError && (
              <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-xs font-bold flex items-center gap-2 shrink-0">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{globalError}</span>
              </div>
            )}

            {/* Parsed Rows Preview */}
            {parsedRows.length > 0 && (
              <div className="space-y-1.5 flex-1 flex flex-col min-h-32 overflow-hidden">
                <div className="flex items-center justify-between text-xs font-bold text-stone-700 shrink-0">
                  <span>معاينة بيانات المعلمين المقروءة:</span>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {formatNumberEn(validCount)} صالح
                    </span>
                    {invalidCount > 0 && (
                      <span className="text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                        {formatNumberEn(invalidCount)} غير صالح
                      </span>
                    )}
                  </div>
                </div>

                <div className="border border-stone-200 rounded-2xl overflow-y-auto flex-1 max-h-48 text-xs bg-stone-50">
                  <table className="w-full text-right divide-y divide-stone-200 whitespace-nowrap">
                    <thead className="bg-stone-100 text-stone-700 sticky top-0 text-[11px] font-bold">
                      <tr>
                        <th className="p-2 px-3">الحالة</th>
                        <th className="p-2 px-3">اسم المعلم</th>
                        <th className="p-2 px-3">رقم الجوال</th>
                        <th className="p-2 px-3">الحلقة</th>
                        <th className="p-2 px-3">البريد الإلكتروني</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 bg-white">
                      {parsedRows.map((row, idx) => (
                        <tr key={idx} className={row.isValid ? 'hover:bg-stone-50' : 'bg-red-50/50'}>
                          <td className="p-2 px-3">
                            {row.isValid ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 text-[10px] font-bold">
                                <Check className="w-3.5 h-3.5" />
                                <span>صالح</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-600 text-[10px] font-bold" title={row.errorMessage}>
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span className="truncate max-w-[120px]">{row.errorMessage}</span>
                              </span>
                            )}
                          </td>
                          <td className="p-2 px-3 font-bold text-stone-900">{row.name}</td>
                          <td className="p-2 px-3 tabular-nums text-stone-700" dir="ltr">{row.phoneNumber}</td>
                          <td className="p-2 px-3 text-stone-600">{row.halaqahName}</td>
                          <td className="p-2 px-3 text-stone-500 tabular-nums text-[11px]">{row.email || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-stone-200 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-bold transition-all cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={validCount === 0 || isProcessing}
                className="px-5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isProcessing
                    ? 'جارٍ استيراد المعلمين...'
                    : `تأكيد استيراد (${formatNumberEn(validCount)}) معلم`}
                </span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
