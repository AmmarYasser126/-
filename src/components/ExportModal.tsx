import React, { useState, useEffect } from 'react';
import { Student, AttendanceRecord, TeacherProfile, HalaqahClass } from '../types';
import { formatDateEn, formatNumberEn } from '../utils/format';
import {
  calculateStudentStats,
  getLogs,
  calculateCompletedSurahs,
  getHalaqat,
  getStudents,
  calculateWeeklyHalaqahAttendance,
} from '../utils/storage';
import {
  createGoogleSheet,
  createGoogleDoc,
  preloadGoogleIdentityScript,
  getCachedAccessToken,
  isArabicDevice,
} from '../utils/googleWorkspace';
import {
  X,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  GraduationCap,
} from 'lucide-react';

export type ExportType = 'students' | 'attendance' | 'single_student' | 'teachers' | 'classes' | 'single_teacher';

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  exportType: ExportType;
  students?: Student[];
  teachers?: TeacherProfile[];
  classes?: HalaqahClass[];
  attendanceRecords?: AttendanceRecord[];
  singleStudent?: Student | null;
  singleTeacher?: TeacherProfile | null;
  className?: string;
  date?: string;
}

// Utility to remove all emojis from text for clean exports
export function stripEmojis(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2B50}\u{1F000}-\u{1F02F}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

import { calculateCurrentAge } from '../utils/gradeHelper';

// Helper to compute age from student grade or registered age
function getEstimatedAge(grade?: string, age?: number, ageAssignedDate?: string): string {
  if (age) {
    const calculated = calculateCurrentAge(age, ageAssignedDate);
    if (calculated.currentAge) {
      return `${formatNumberEn(calculated.currentAge)} سنة`;
    }
  }
  if (!grade) return '—';
  if (grade.includes('الأول الابتدائي')) return '6 - 7 سنوات';
  if (grade.includes('الثاني الابتدائي')) return '7 - 8 سنوات';
  if (grade.includes('الثالث الابتدائي')) return '8 - 9 سنوات';
  if (grade.includes('الرابع الابتدائي')) return '9 - 10 سنوات';
  if (grade.includes('الخامس الابتدائي')) return '10 - 11 سنة';
  if (grade.includes('السادس الابتدائي')) return '11 - 12 سنة';
  if (grade.includes('الأول المتوسط')) return '12 - 13 سنة';
  if (grade.includes('الثاني المتوسط')) return '13 - 14 سنة';
  if (grade.includes('الثالث المتوسط')) return '14 - 15 سنة';
  if (grade.includes('الأول الثانوي')) return '15 - 16 سنة';
  if (grade.includes('الثاني الثانوي')) return '16 - 17 سنة';
  if (grade.includes('الثالث الثانوي')) return '17 - 18 سنة';
  if (grade.includes('جامعي') || grade.includes('الجامعية') || grade.includes('كبار')) return '18+ سنة';
  if (grade.includes('موظف') || grade.includes('موضف')) return '22+ سنة';
  if (grade.includes('متقاعد')) return '60+ سنة';
  return '—';
}

function triggerAnchorNavigation(url: string) {
  if (!url) return;
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
  }, 200);
}

function openExportUrlDirectly(url: string): boolean {
  if (!url) return false;
  try {
    const openedWin = window.open(url, '_blank');
    if (openedWin) {
      return true;
    }
  } catch {
    // Fallback to anchor click
  }
  triggerAnchorNavigation(url);
  return true;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  exportType,
  students = [],
  teachers = [],
  classes = [],
  attendanceRecords = [],
  singleStudent,
  singleTeacher,
  className,
  date,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'sheets' | 'docs'>('sheets');
  const [isCopied, setIsCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [readyFileLink, setReadyFileLink] = useState<{
    url: string;
    format: 'sheets' | 'docs';
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsCopied(false);
      setExportError(null);
      setReadyFileLink(null);
      preloadGoogleIdentityScript();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const count =
    exportType === 'students'
      ? students.length
      : exportType === 'teachers'
      ? teachers.length
      : exportType === 'classes'
      ? (classes.length > 0 ? classes.length : getHalaqat().length)
      : exportType === 'attendance'
      ? attendanceRecords.length
      : 1;

  // Title generation
  const getExportTitle = () => {
    const today = formatDateEn(new Date());
    const cleanHalaqah = (className || 'جميع الحلقات').replace(/_/g, ' ').trim();
    if (exportType === 'students') {
      return stripEmojis(`بيانات طلاب جامع الوالدين - ${cleanHalaqah} (${today})`);
    } else if (exportType === 'teachers') {
      return stripEmojis(`سجل معلمي جامع الوالدين والحلقات (${today})`);
    } else if (exportType === 'classes') {
      const isSingle = classes && classes.length === 1;
      return stripEmojis(
        isSingle
          ? `بيانات حلقة ${classes[0].name} (${today})`
          : `دليل وسجل حلقات جامع الوالدين (${today})`
      );
    } else if (exportType === 'single_teacher') {
      return stripEmojis(`تقرير المعلم وحلقته - ${singleTeacher?.name || 'المعلم'} (${today})`);
    } else if (exportType === 'attendance') {
      const attDate = date || today;
      return stripEmojis(`سجل تحضير جامع الوالدين - ${cleanHalaqah} (${attDate})`);
    } else {
      return stripEmojis(`التقرير الفردي الشامل - ${singleStudent?.fullName || 'الطالب'} (${today})`);
    }
  };

  // Subtitle generation
  const getExportSubtitle = () => {
    if (exportType === 'students') {
      return stripEmojis(
        `جامع الوالدين — بيانات شاملة لـ (${formatNumberEn(count)}) طالب تشمل عدد السور المحفوظة، أيام الحضور، أيام الغياب، الأجزاء، وأرقام التواصل`
      );
    } else if (exportType === 'teachers') {
      return stripEmojis(
        `جامع الوالدين — بيانات شاملة لـ (${formatNumberEn(count)}) معلم تشمل طلاب الحلقة، جلسات التسميع، الآيات، وعدد سور الحفظ`
      );
    } else if (exportType === 'classes') {
      return stripEmojis(
        `جامع الوالدين — بيانات لـ (${formatNumberEn(count)}) حلقة قرآنية تشمل طلاب الحلقة، جلسات التسميع، الآيات، عدد سور الحفظ، وإجمالي الغياب هذا الأسبوع`
      );
    } else if (exportType === 'single_teacher') {
      return stripEmojis(
        `جامع الوالدين — تقرير مفصل للمعلم: ${singleTeacher?.name || ''} يشمل طلاب الحلقة، جلسات التسميع، الآيات، عدد سور الحفظ، وبيانات الدخول الرسمية`
      );
    } else if (exportType === 'attendance') {
      return stripEmojis(
        `جامع الوالدين — سجل التحضير (${formatNumberEn(count)} سجل) المعتمد`
      );
    } else {
      return stripEmojis(
        `جامع الوالدين — التقرير الفردي الشامل للطالب: ${singleStudent?.fullName || ''} مع السور والآيات`
      );
    }
  };

  // Helper to format HTML Table with Title + Table, oriented RTL on Arabic devices and LTR on English devices
  const formatHtmlTable = (headers: string[], rows: (string | number)[][]) => {
    const isRtl = isArabicDevice();
    const dirAttr = isRtl ? 'rtl' : 'ltr';
    const alignStyle = isRtl ? 'right' : 'left';
    const titleText = getExportTitle();

    return `
      <div dir="${dirAttr}" style="direction:${dirAttr}; text-align:${alignStyle}; font-family:Arial, sans-serif;">
        <table border="1" dir="${dirAttr}" style="direction:${dirAttr}; border-collapse:collapse; text-align:${alignStyle}; font-family:Arial, sans-serif; width:100%;">
          <thead>
            <tr style="background-color:#064e3b; color:#ffffff; font-weight:bold; font-size:15px;">
              <th colspan="${headers.length}" dir="${dirAttr}" style="padding:10px 12px; border:1px solid #064e3b; text-align:center;">${titleText}</th>
            </tr>
            <tr style="background-color:#065f46; color:#ffffff; font-weight:bold;">
              ${headers.map((h) => {
                const isNum = h === 'م' || h === '#' || h === 'الرقم';
                return `<th dir="${dirAttr}" style="padding:${isNum ? '6px 4px' : '8px 10px'}; border:1px solid #047857; text-align:${isNum ? 'center' : alignStyle}; width:${isNum ? '36px' : 'auto'};">${h}</th>`;
              }).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map((r) => `<tr>${r.map((c, i) => {
              const isNum = headers[i] === 'م' || headers[i] === '#' || headers[i] === 'الرقم';
              return `<td dir="${dirAttr}" style="padding:${isNum ? '5px 4px' : '6px 10px'}; border:1px solid #e5e7eb; text-align:${isNum ? 'center' : alignStyle}; width:${isNum ? '36px' : 'auto'};">${c}</td>`;
            }).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  // Generate Tabular Data
  const generateTabularData = () => {
    const titleText = getExportTitle();
    if (exportType === 'students') {
      const rawHeaders = [
        'م',
        'اسم الطالب الرباعي',
        'الحلقة / الفصل',
        'المرحلة / الصف الدراسي',
        'العمر التقديري',
        'الأجزاء المحفوظة',
        'عدد السور المحفوظة',
        'الآيات المحفوظة',
        'الآيات المراجعة',
        'مجموع النجوم',
        'آخر موضع توقف عنده',
        'أيام الحضور (الأسبوع الحالي)',
        'أيام الغياب (الأسبوع الحالي)',
        'إجمالي جلسات التسميع',
        'رقم جوال الطالب',
        'رقم جوال ولي الأمر',
        'رمز الدخول PIN',
        'تاريخ التسجيل',
      ];
      const rawRows = students.map((s, idx) => {
        const stats = calculateStudentStats(s.id);
        const sLogs = getLogs(s.id);
        const completedSurahsRes = calculateCompletedSurahs(s.id);

        return [
          formatNumberEn(idx + 1),
          s.fullName,
          s.halaqahName || className || 'حلقة عامة',
          s.grade || (s.gradeLevel ? `الصف ${formatNumberEn(s.gradeLevel)}` : '—'),
          getEstimatedAge(s.grade, s.age, s.ageAssignedDate),
          `${formatNumberEn(stats.completedAjzaCount)} أجزاء`,
          `${formatNumberEn(completedSurahsRes.completedCount)} سورة`,
          `${formatNumberEn(stats.totalMemorizedAyahs)} آية`,
          `${formatNumberEn(stats.totalReviewedAyahs)} آية`,
          `${formatNumberEn(stats.totalStars)} نجمة`,
          stats.currentSurahName || s.lastSurahStoppedAt || (s.startSurah === 'al-baqarah' ? 'سورة الفاتحة' : 'سورة الناس'),
          `${formatNumberEn(stats.totalPresent)} يوم`,
          `${formatNumberEn(stats.totalAbsents)} يوم`,
          `${formatNumberEn(sLogs.length)} جلسة`,
          s.studentPhone || '—',
          s.rawPhoneNumber || s.phoneNumberDisplay || '—',
          s.passwordPin || '—',
          s.registeredAt ? formatDateEn(s.registeredAt) : '—',
        ];
      });

      const headers = rawHeaders.map(h => stripEmojis(h));
      const rows = rawRows.map(r => r.map(c => stripEmojis(String(c))));
      const tsv = [titleText, headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
      const htmlTable = formatHtmlTable(headers, rows);
      return { tsv, htmlTable, headers, rows };
    } else if (exportType === 'teachers') {
      const rawHeaders = [
        'م',
        'اسم المدرس',
        'طلاب الحلقة',
        'جلسات التسميع',
        'آيات الحفظ المنجزة',
        'آيات المراجعة',
        'عدد سور الحفظ',
      ];
      const rawRows = teachers.map((t, idx) => {
        const halaqahStudents = (students.length > 0 ? students : getStudents()).filter(
          s => s.halaqahId === t.halaqahId || s.halaqahName === t.halaqahName
        );
        let totalHifzAyahs = 0;
        let totalReviewAyahs = 0;
        let totalCompletedSurahsCount = 0;
        let totalSessions = 0;

        halaqahStudents.forEach(s => {
          const stats = calculateStudentStats(s.id);
          const comp = calculateCompletedSurahs(s.id);
          const sLogs = getLogs(s.id);
          totalHifzAyahs += stats.totalMemorizedAyahs;
          totalReviewAyahs += stats.totalReviewedAyahs;
          totalCompletedSurahsCount += comp.completedCount;
          totalSessions += sLogs.length;
        });

        return [
          formatNumberEn(idx + 1),
          t.name,
          `${formatNumberEn(halaqahStudents.length)} طلاب`,
          `${formatNumberEn(totalSessions)} جلسة`,
          `${formatNumberEn(totalHifzAyahs)} آية`,
          `${formatNumberEn(totalReviewAyahs)} آية`,
          `${formatNumberEn(totalCompletedSurahsCount)} سورة`,
        ];
      });

      const headers = rawHeaders.map(h => stripEmojis(h));
      const rows = rawRows.map(r => r.map(c => stripEmojis(String(c))));
      const tsv = [titleText, headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
      const htmlTable = formatHtmlTable(headers, rows);
      return { tsv, htmlTable, headers, rows };
    } else if (exportType === 'classes') {
      const allHalaqat = classes.length > 0 ? classes : getHalaqat();
      const allStudents = students.length > 0 ? students : getStudents();

      const rawHeaders = [
        'م',
        'اسم الحلقة',
        'طلاب الحلقة',
        'جلسات التسميع',
        'آيات الحفظ المنجزة',
        'آيات المراجعة',
        'عدد سور الحفظ',
        'إجمالي الغياب هذا الأسبوع',
      ];

      const rawRows = allHalaqat.map((h, idx) => {
        const classStudents = allStudents.filter(
          (s) => s.halaqahId === h.id || s.halaqahName === h.name
        );
        let totalHifzAyahs = 0;
        let totalReviewAyahs = 0;
        let totalCompletedSurahsCount = 0;
        let totalSessions = 0;

        classStudents.forEach((s) => {
          const stats = calculateStudentStats(s.id);
          const comp = calculateCompletedSurahs(s.id);
          const sLogs = getLogs(s.id);
          totalHifzAyahs += stats.totalMemorizedAyahs;
          totalReviewAyahs += stats.totalReviewedAyahs;
          totalCompletedSurahsCount += comp.completedCount;
          totalSessions += sLogs.length;
        });

        const weeklyAttendance = calculateWeeklyHalaqahAttendance(
          classStudents.map((s) => s.id),
          h.id
        );
        const weeklyAbsents = weeklyAttendance.absent;

        return [
          formatNumberEn(idx + 1),
          h.name,
          `${formatNumberEn(classStudents.length)} طلاب`,
          `${formatNumberEn(totalSessions)} جلسة`,
          `${formatNumberEn(totalHifzAyahs)} آية`,
          `${formatNumberEn(totalReviewAyahs)} آية`,
          `${formatNumberEn(totalCompletedSurahsCount)} سورة`,
          `${formatNumberEn(weeklyAbsents)} غياب`,
        ];
      });

      const headers = rawHeaders.map((h) => stripEmojis(h));
      const rows = rawRows.map((r) => r.map((c) => stripEmojis(String(c))));
      const tsv = [titleText, headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
      const htmlTable = formatHtmlTable(headers, rows);
      return { tsv, htmlTable, headers, rows };
    } else if (exportType === 'single_teacher') {
      const t = singleTeacher;
      if (!t) {
        return { tsv: '', htmlTable: '', headers: [], rows: [] };
      }
      const allStudents = students.length > 0 ? students : getStudents();
      const teacherStudents = allStudents.filter(
        (s) => s.halaqahId === t.halaqahId || s.halaqahName === t.halaqahName
      );

      let totalHifzAyahs = 0;
      let totalReviewAyahs = 0;
      let totalCompletedSurahsCount = 0;
      let totalSessions = 0;

      teacherStudents.forEach((s) => {
        const stats = calculateStudentStats(s.id);
        const comp = calculateCompletedSurahs(s.id);
        const sLogs = getLogs(s.id);
        totalHifzAyahs += stats.totalMemorizedAyahs;
        totalReviewAyahs += stats.totalReviewedAyahs;
        totalCompletedSurahsCount += comp.completedCount;
        totalSessions += sLogs.length;
      });

      const rawHeaders = [
        'م',
        'اسم المدرس',
        'طلاب الحلقة',
        'جلسات التسميع',
        'آيات الحفظ المنجزة',
        'آيات المراجعة',
        'عدد سور الحفظ',
        'بيانات الدخول والحساب الرسمي',
      ];

      const credentialsText = `الجوال: ${t.phoneNumber || '—'} | الرمز PIN: ${t.passwordPin || '—'}${t.email ? ` | البريد: ${t.email}` : ''}`;

      const rawRows = [
        [
          formatNumberEn(1),
          t.name,
          `${formatNumberEn(teacherStudents.length)} طلاب`,
          `${formatNumberEn(totalSessions)} جلسة`,
          `${formatNumberEn(totalHifzAyahs)} آية`,
          `${formatNumberEn(totalReviewAyahs)} آية`,
          `${formatNumberEn(totalCompletedSurahsCount)} سورة`,
          credentialsText,
        ],
      ];

      const headers = rawHeaders.map(h => stripEmojis(h));
      const rows = rawRows.map(r => r.map(c => stripEmojis(String(c))));
      const tsv = [titleText, headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
      const htmlTable = formatHtmlTable(headers, rows);
      return { tsv, htmlTable, headers, rows };
    } else if (exportType === 'attendance') {
      const statusLabels: Record<string, string> = {
        present: 'حاضر',
        late: 'متأخر',
        excused: 'مستأذن',
        absent: 'غائب',
      };
      const rawHeaders = ['م', 'اسم الطالب', 'الحلقة / الفصل', 'التاريخ', 'حالة الحضور والغياب', 'الملاحظات'];
      const rawRows = attendanceRecords.map((r, idx) => [
        formatNumberEn(idx + 1),
        r.studentName || '—',
        r.halaqahName || className || 'عامة',
        r.date,
        statusLabels[r.status] || r.status,
        r.notes || '—',
      ]);

      const headers = rawHeaders.map(h => stripEmojis(h));
      const rows = rawRows.map(r => r.map(c => stripEmojis(String(c))));
      const tsv = [titleText, headers.join('\t'), ...rows.map(row => row.join('\t'))].join('\n');
      const htmlTable = formatHtmlTable(headers, rows);
      return { tsv, htmlTable, headers, rows };
    } else {
      const stats = singleStudent ? calculateStudentStats(singleStudent.id) : null;
      const sLogs = singleStudent ? getLogs(singleStudent.id) : [];
      const completedSurahsRes = singleStudent ? calculateCompletedSurahs(singleStudent.id) : { completedCount: 0, completedSurahs: [] };

      const rawHeaders = ['م', 'البيان / الحقل', 'القيمة والتفاصيل والمعلومات'];
      const rawFields: [string, string][] = [
        ['اسم الطالب الكامل', singleStudent?.fullName || '—'],
        ['الحلقة / الفصل', singleStudent?.halaqahName || '—'],
        ['الصف الدراسي', singleStudent?.grade || '—'],
        ['العمر التقديري', getEstimatedAge(singleStudent?.grade, singleStudent?.age, singleStudent?.ageAssignedDate)],
        ['أيام الحضور (الأسبوع الحالي)', stats ? `${formatNumberEn(stats.totalPresent)} يوم` : '—'],
        ['أيام الغياب (الأسبوع الحالي)', stats ? `${formatNumberEn(stats.totalAbsents)} يوم` : '—'],
        ['عدد الأجزاء المحفوظة المكتملة', stats ? `${formatNumberEn(stats.completedAjzaCount)} أجزاء` : '—'],
        ['عدد السور المحفوظة المكتملة', `${formatNumberEn(completedSurahsRes.completedCount)} سورة`],
        ['إجمالي الآيات المحفوظة', stats ? `${formatNumberEn(stats.totalMemorizedAyahs)} آية` : '—'],
        ['إجمالي الآيات المراجعة', stats ? `${formatNumberEn(stats.totalReviewedAyahs)} آية` : '—'],
        ['مجموع النجوم المحصلة', stats ? `${formatNumberEn(stats.totalStars)} نجمة` : '—'],
        ['الموضع الحالي وآخر سورة توقف عندها', stats?.currentSurahName || singleStudent?.lastSurahStoppedAt || '—'],
        ['إجمالي جلسات التسميع الموثقة', `${formatNumberEn(sLogs.length)} جلسة`],
        ['تاريخ آخر جلسة تسميع', sLogs.length > 0 ? formatDateEn(sLogs[0].date) : 'لا يوجد تسميع بعد'],
        ['رقم جوال الطالب الخاص', singleStudent?.studentPhone || '—'],
        ['رقم جوال ولي الأمر', singleStudent?.rawPhoneNumber || singleStudent?.phoneNumberDisplay || '—'],
        ['رمز الدخول PIN', singleStudent?.passwordPin || '—'],
        ['تاريخ التسجيل بالمنظومة', singleStudent?.registeredAt ? formatDateEn(singleStudent.registeredAt) : '—'],
      ];

      const rawRows = rawFields.map((field, idx) => [
        formatNumberEn(idx + 1),
        field[0],
        field[1],
      ]);

      const headers = rawHeaders.map(h => stripEmojis(h));
      const rows = rawRows.map(r => r.map(c => stripEmojis(String(c))));
      const tsv = [titleText, headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
      const htmlTable = formatHtmlTable(headers, rows);
      return { tsv, htmlTable, headers, rows };
    }
  };

  const tableData = generateTabularData();

  const copyTableToClipboard = async () => {
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const textBlob = new Blob([tableData.tsv], { type: 'text/plain' });
        const htmlBlob = new Blob([tableData.htmlTable], { type: 'text/html' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': textBlob,
            'text/html': htmlBlob,
          }),
        ]);
        return;
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(tableData.tsv);
        return;
      }
    } catch {
      // Fallback to synchronous textarea copy
    }
    try {
      const textarea = document.createElement('textarea');
      textarea.value = tableData.tsv;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    } catch {
      // Ignore
    }
  };

  const handleCopyDirectToClipboard = async () => {
    await copyTableToClipboard();
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 5000);
  };

  const handleCloudExport = async (format: 'sheets' | 'docs') => {
    setSelectedFormat(format);
    setIsExporting(true);
    setExportError(null);
    setReadyFileLink(null);

    const title = getExportTitle();
    const subtitle = getExportSubtitle();

    try {
      if (format === 'sheets') {
        const result = await createGoogleSheet(
          title,
          tableData.headers,
          tableData.rows,
          subtitle
        );
        if (result.spreadsheetUrl) {
          const openedAutomatically = openExportUrlDirectly(result.spreadsheetUrl);
          if (!openedAutomatically) {
            setReadyFileLink({ url: result.spreadsheetUrl, format: 'sheets' });
          }
        }
      } else {
        const result = await createGoogleDoc(
          title,
          tableData.headers,
          tableData.rows,
          subtitle
        );
        if (result.documentUrl) {
          const openedAutomatically = openExportUrlDirectly(result.documentUrl);
          if (!openedAutomatically) {
            setReadyFileLink({ url: result.documentUrl, format: 'docs' });
          }
        }
      }
    } catch (err: any) {
      console.error('Google Workspace export error:', err);
      setExportError(
        err?.message || 'حدث خطأ أثناء الاتصال بحساب Google. يرجى المحاولة مرة أخرى.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in">
      <div
        className="bg-white max-w-2xl w-full rounded-3xl p-5 sm:p-6 shadow-2xl border border-stone-200 space-y-4 text-right relative max-h-[92vh] overflow-y-auto"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <div className="min-w-0 pr-1">
            <h3 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
              {exportType === 'teachers' || exportType === 'single_teacher' ? (
                <GraduationCap className="w-5 h-5 text-amber-600 shrink-0" />
              ) : (
                <FileSpreadsheet className="w-5 h-5 text-emerald-700 shrink-0" />
              )}
              <span>
                {exportType === 'teachers'
                  ? 'تصدير بيانات المعلمين'
                  : exportType === 'classes'
                  ? 'تصدير دليل وسجل الحلقات'
                  : exportType === 'single_teacher'
                  ? `تصدير تقرير المعلم (${singleTeacher?.name || ''})`
                  : exportType === 'students'
                  ? className
                    ? `تصدير طلاب حلقة (${className})`
                    : 'تصدير بيانات الطلاب'
                  : exportType === 'attendance'
                  ? 'تصدير سجل التحضير'
                  : 'تصدير التقرير الفردي'}
              </span>
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Export Action Buttons */}
        <div className="space-y-3">
          {/* Top Row: Right = Google Sheet, Left = Google Docs (in RTL grid-cols-2) */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {/* Right Box (RTL first item): Google Sheets */}
            {readyFileLink?.format === 'sheets' ? (
              <a
                href={readyFileLink.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setReadyFileLink(null)}
                className="p-4 sm:p-5 rounded-2xl border-2 border-emerald-600 bg-emerald-600 text-white text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2.5 min-h-[130px] shadow-lg hover:bg-emerald-700 animate-in fade-in"
              >
                <div className="p-3 rounded-xl bg-white/20 text-white shrink-0">
                  <ExternalLink className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-black text-sm sm:text-base text-white">
                    افتح الجدول الجاهز الآن
                  </h4>
                  <p className="text-[11px] text-emerald-100 leading-tight">
                    تم إنشاء الجدول والعنوان في Google Sheets
                  </p>
                </div>
              </a>
            ) : (
              <button
                type="button"
                onClick={() => handleCloudExport('sheets')}
                disabled={isExporting}
                className={`p-4 sm:p-5 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2.5 min-h-[130px] group relative disabled:opacity-60 ${
                  isExporting && selectedFormat === 'sheets'
                    ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/30'
                    : 'border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 hover:border-emerald-500 hover:shadow-md'
                }`}
              >
                <div className="p-3 rounded-xl bg-emerald-700 text-white shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  {isExporting && selectedFormat === 'sheets' ? (
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                  ) : (
                    <FileSpreadsheet className="w-6 h-6" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    <h4 className="font-black text-sm sm:text-base text-stone-900 group-hover:text-emerald-950">
                      Google Sheet
                    </h4>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-tight">
                    {isExporting && selectedFormat === 'sheets'
                      ? 'جارٍ الإنشاء والفتح في Google Sheets...'
                      : 'تصدير مباشر وفتح الجدول في Google Sheets'}
                  </p>
                </div>
              </button>
            )}

            {/* Left Box (RTL second item): Google Docs */}
            {readyFileLink?.format === 'docs' ? (
              <a
                href={readyFileLink.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setReadyFileLink(null)}
                className="p-4 sm:p-5 rounded-2xl border-2 border-blue-600 bg-blue-600 text-white text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2.5 min-h-[130px] shadow-lg hover:bg-blue-700 animate-in fade-in"
              >
                <div className="p-3 rounded-xl bg-white/20 text-white shrink-0">
                  <ExternalLink className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-black text-sm sm:text-base text-white">
                    افتح التقرير الجاهز الآن
                  </h4>
                  <p className="text-[11px] text-blue-100 leading-tight">
                    تم إنشاء الجدول والعنوان في Google Docs
                  </p>
                </div>
              </a>
            ) : (
              <button
                type="button"
                onClick={() => handleCloudExport('docs')}
                disabled={isExporting}
                className={`p-4 sm:p-5 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2.5 min-h-[130px] group relative disabled:opacity-60 ${
                  isExporting && selectedFormat === 'docs'
                    ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-600/30'
                    : 'border-blue-200 bg-blue-50/40 hover:bg-blue-50 hover:border-blue-500 hover:shadow-md'
                }`}
              >
                <div className="p-3 rounded-xl bg-blue-700 text-white shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  {isExporting && selectedFormat === 'docs' ? (
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                  ) : (
                    <FileText className="w-6 h-6" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    <h4 className="font-black text-sm sm:text-base text-stone-900 group-hover:text-blue-950">
                      Google Docs
                    </h4>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-tight">
                    {isExporting && selectedFormat === 'docs'
                      ? 'جارٍ الإنشاء والفتح في Google Docs...'
                      : 'تصدير مباشر وفتح التقرير في Google Docs'}
                  </p>
                </div>
              </button>
            )}
          </div>

          {exportError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold text-center">
              {exportError}
            </div>
          )}

          {/* Bottom Full-Width Box: Copy Table */}
          <button
            type="button"
            onClick={handleCopyDirectToClipboard}
            className={`w-full py-3.5 px-4 rounded-2xl border-2 text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
              isCopied
                ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-600/20'
                : 'bg-stone-50 hover:bg-stone-100 text-stone-800 hover:text-emerald-800 border-stone-300 hover:border-emerald-500'
            }`}
            title="نسخ الجدول إلى الحافظة"
          >
            {isCopied ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>تم نسخ الجدول للحافظة بنجاح</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-emerald-700" />
                <span>نسخ الجدول (Copy Table)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
