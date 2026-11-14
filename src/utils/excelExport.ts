import * as XLSX from 'xlsx';
import { Student, AttendanceRecord, HalaqahClass, SessionLog } from '../types';
import { calculateStudentStats, getLogs, getAttendance } from './storage';
import { formatDateEn, formatTimeEn } from './format';

/**
 * Helper to download a workbook as an Excel file
 */
function downloadWorkbook(workbook: XLSX.WorkBook, fileName: string) {
  XLSX.writeFile(workbook, fileName);
}

/**
 * Export Attendance Records to Excel (.xlsx)
 * Supports exporting single class or all classes, for specific date or full history
 */
export function exportAttendanceToExcel(
  records: AttendanceRecord[],
  options: {
    className?: string;
    date?: string;
    allStudents?: Student[];
  } = {}
) {
  const statusLabels: Record<string, string> = {
    present: 'حاضر',
    late: 'متأخر',
    excused: 'مستأذن',
    absent: 'غائب',
  };

  const rows = records.map((record, index) => {
    return {
      'م': index + 1,
      'اسم الطالب': record.studentName || '—',
      'الحلقة / الفصل': record.halaqahName || options.className || 'عامة',
      'التاريخ': record.date,
      'حالة الحضور': statusLabels[record.status] || record.status,
      'الملاحظات': record.notes || '—',
      'وقت التسجيل': record.createdAt ? formatTimeEn(record.createdAt) : '—',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set RTL and column widths
  worksheet['!cols'] = [
    { wch: 6 },  // م
    { wch: 25 }, // اسم الطالب
    { wch: 20 }, // الحلقة
    { wch: 15 }, // التاريخ
    { wch: 12 }, // حالة الحضور
    { wch: 30 }, // الملاحظات
    { wch: 15 }, // وقت التسجيل
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'سجل الحضور');

  // Compute filename
  const classLabel = options.className ? `_${options.className.replace(/\s+/g, '_')}` : '_جميع_الحلقات';
  const dateLabel = options.date ? `_${options.date}` : '';
  const fileName = `سجل_حضور${classLabel}${dateLabel}.xlsx`;

  downloadWorkbook(workbook, fileName);
}

/**
 * Export Students List with Full Memorization & Contact Info to Excel
 */
export function exportStudentsToExcel(
  students: Student[],
  options: {
    className?: string;
    logs?: SessionLog[];
  } = {}
) {
  const rows = students.map((student, index) => {
    const stats = calculateStudentStats(student.id);
    const studentLogs = getLogs(student.id);
    const lastLog = studentLogs.length > 0 ? studentLogs[0] : null;

    let lastSessionDesc = '—';
    if (lastLog) {
      if (lastLog.type === 'combined') {
        lastSessionDesc = `حفظ: ${lastLog.surahName} (${lastLog.startAyah}-${lastLog.endAyah}) | مراجعة: ${lastLog.murajaahSurahName || lastLog.surahName}`;
      } else {
        lastSessionDesc = `${lastLog.type === 'hifz' ? 'حفظ' : 'مراجعة'}: ${lastLog.surahName} (${lastLog.startAyah}-${lastLog.endAyah})`;
      }
    }

    return {
      'م': index + 1,
      'اسم الطالب': student.fullName,
      'الحلقة / الفصل': student.halaqahName || 'حلقة عامة',
      'جوال ولي الأمر': student.rawPhoneNumber || '—',
      'رمز الدخول': student.passwordPin || '—',
      'الآيات المحفوظة': stats.totalMemorizedAyahs,
      'نسبة الختمة %': `${stats.memorizedPercentage}%`,
      'الأجزاء المكتملة': stats.completedAjzaCount,
      'آيات المراجعة والتثبيت': stats.totalReviewedAyahs,
      'آخر موضع تسميع': stats.currentSurahName ? `سورة ${stats.currentSurahName} (${stats.currentSurahProgress.startAyah}-${stats.currentSurahProgress.endAyah})` : '—',
      'آخر جلسة مسجلة': lastSessionDesc,
      'تاريخ آخر تسميع': lastLog?.date || '—',
      'أيام الالتزام': stats.streakDays,
      'تاريخ التسجيل': student.registeredAt ? formatDateEn(student.registeredAt) : '—',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  worksheet['!cols'] = [
    { wch: 6 },  // م
    { wch: 25 }, // اسم الطالب
    { wch: 20 }, // الحلقة
    { wch: 16 }, // جوال ولي الأمر
    { wch: 12 }, // رمز الدخول
    { wch: 14 }, // الآيات المحفوظة
    { wch: 14 }, // نسبة الختمة %
    { wch: 14 }, // الأجزاء المكتملة
    { wch: 18 }, // آيات المراجعة والتثبيت
    { wch: 24 }, // آخر موضع تسميع
    { wch: 35 }, // آخر جلسة مسجلة
    { wch: 15 }, // تاريخ آخر تسميع
    { wch: 12 }, // أيام الالتزام
    { wch: 15 }, // تاريخ التسجيل
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'قائمة الطلاب');

  const classLabel = options.className ? `_${options.className.replace(/\s+/g, '_')}` : '_الشامل';
  const fileName = `بيانات_طلاب_التحفيظ${classLabel}.xlsx`;

  downloadWorkbook(workbook, fileName);
}

/**
 * Export Individual Student Detailed Report to Excel
 */
export function exportSingleStudentReportToExcel(student: Student) {
  const stats = calculateStudentStats(student.id);
  const studentLogs = getLogs(student.id);

  // Summary sheet
  const summaryData = [
    { 'البيان': 'اسم الطالب', 'القيمة': student.fullName },
    { 'البيان': 'الحلقة / الفصل', 'القيمة': student.halaqahName || 'حلقة عامة' },
    { 'البيان': 'جوال ولي الأمر', 'القيمة': student.rawPhoneNumber || '—' },
    { 'البيان': 'رمز الدخول', 'القيمة': student.passwordPin || '—' },
    { 'البيان': 'إجمالي الآيات المحفوظة', 'القيمة': `${stats.totalMemorizedAyahs} آية` },
    { 'البيان': 'نسبة إنجاز المصحف الشريف', 'القيمة': `${stats.memorizedPercentage}%` },
    { 'البيان': 'الأجزاء المكتملة (من 30)', 'القيمة': `${stats.completedAjzaCount} أجزاء` },
    { 'البيان': 'إجمالي آيات المراجعة والتثبيت', 'القيمة': `${stats.totalReviewedAyahs} آية` },
    { 'البيان': 'آخر موضع تسميع', 'القيمة': `سورة ${stats.currentSurahName} (الآيات ${stats.currentSurahProgress.startAyah}-${stats.currentSurahProgress.endAyah})` },
    { 'البيان': 'أيام الالتزام المتتالية', 'القيمة': `${stats.streakDays} يوم` },
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 28 }, { wch: 40 }];

  // Logs history sheet
  const logsData = studentLogs.map((log, index) => ({
    'م': index + 1,
    'التاريخ': log.date,
    'النوع': log.type === 'combined' ? 'حفظ + مراجعة' : log.type === 'hifz' ? 'حفظ جديد' : 'مراجعة',
    'السورة': log.surahName,
    'من آية': log.startAyah,
    'إلى آية': log.endAyah,
    'عدد الآيات': log.ayahsCount,
    'سورة المراجعة': log.murajaahSurahName || '—',
    'تقييم المعلم': log.teacherGrade || 'ممتاز',
    'ملاحظات المعلم': log.teacherNotes || '—',
  }));

  const logsSheet = XLSX.utils.json_to_sheet(logsData);
  logsSheet['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 15 },
    { wch: 18 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 18 },
    { wch: 14 },
    { wch: 30 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'الملخص');
  XLSX.utils.book_append_sheet(workbook, logsSheet, 'سجل التسميع');

  const fileName = `تقرير_الطالب_${student.fullName.replace(/\s+/g, '_')}.xlsx`;
  downloadWorkbook(workbook, fileName);
}
