import { Student, AttendanceRecord, SessionLog } from '../types';
import { calculateStudentStats, getLogs, getAdminSettings } from './storage';
import { formatNumberEn, formatDateEn } from './format';

/**
 * Downloads an HTML string as a formatted .doc file (natively opened by Google Docs and Microsoft Word)
 */
function downloadDocFile(contentHtml: string, fileName: string) {
  const fullHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${fileName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Cairo', 'Segoe UI', Tahoma, Geneva, Verdana, Arial, sans-serif;
      direction: rtl;
      text-align: right;
      background-color: #ffffff;
      color: #1c1917;
      padding: 24px;
      margin: 0;
    }
    .header-box {
      text-align: center;
      border-bottom: 2px solid #047857;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .mosque-title {
      font-size: 22px;
      font-weight: bold;
      color: #065f46;
      margin: 0 0 6px 0;
    }
    .report-title {
      font-size: 16px;
      font-weight: 600;
      color: #44403c;
      margin: 0 0 4px 0;
    }
    .date-badge {
      font-size: 12px;
      color: #78716c;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
      margin-bottom: 24px;
      font-size: 13px;
    }
    th {
      background-color: #065f46;
      color: #ffffff;
      padding: 10px 8px;
      border: 1px solid #047857;
      text-align: right;
      font-weight: bold;
    }
    td {
      padding: 8px;
      border: 1px solid #e7e5e4;
      text-align: right;
    }
    tr:nth-child(even) {
      background-color: #f5f5f4;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: bold;
    }
    .badge-present { background-color: #d1fae5; color: #065f46; }
    .badge-late { background-color: #fef3c7; color: #92400e; }
    .badge-excused { background-color: #e0e7ff; color: #3730a3; }
    .badge-absent { background-color: #fee2e2; color: #991b1b; }
    .card {
      border: 1px solid #e7e5e4;
      border-radius: 8px;
      padding: 14px;
      margin-bottom: 16px;
      background-color: #fafaf9;
    }
    .footer {
      text-align: center;
      font-size: 11px;
      color: #a8a29e;
      margin-top: 32px;
      border-top: 1px solid #e7e5e4;
      padding-top: 12px;
    }
  </style>
</head>
<body>
  ${contentHtml}
  <div class="footer">
    تم إنشاء هذا المستند آلياً عبر نظام إدارة حلقات تحفيظ القرآن الكريم - جامع الوالدين
  </div>
</body>
</html>`;

  const blob = new Blob(['\ufeff', fullHtml], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.doc') ? fileName : `${fileName}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export Students list to Google Docs / Word formatted file
 */
export function exportStudentsToDoc(
  students: Student[],
  options: { className?: string } = {}
) {
  const adminSettings = getAdminSettings();
  const title = options.className
    ? `بيان طلاب ${options.className}`
    : 'التقرير الشامل لطلاب حلقات التحفيظ';

  const rowsHtml = students
    .map((student, idx) => {
      const stats = calculateStudentStats(student.id);
      const studentLogs = getLogs(student.id);
      const lastLog = studentLogs[0];
      const lastProgress = lastLog
        ? `${lastLog.surahName} (${lastLog.startAyah}-${lastLog.endAyah})`
        : '—';

      return `
      <tr>
        <td style="text-align:center;">${formatNumberEn(idx + 1)}</td>
        <td><strong>${student.fullName}</strong></td>
        <td>${student.halaqahName || 'حلقة عامة'}</td>
        <td dir="ltr" style="text-align:right;">${student.rawPhoneNumber || '—'}</td>
        <td style="text-align:center; font-weight:600;">${student.passwordPin || '—'}</td>
        <td style="text-align:center; color:#065f46; font-weight:bold;">${formatNumberEn(stats.totalMemorizedAyahs)} آية</td>
        <td style="text-align:center;">${formatNumberEn(stats.memorizedPercentage)}%</td>
        <td style="text-align:center;">${formatNumberEn(stats.completedAjzaCount)} / 30</td>
        <td>${lastProgress}</td>
      </tr>
    `;
    })
    .join('');

  const contentHtml = `
    <div class="header-box">
      <div class="mosque-title">${adminSettings.mosqueName || 'جامع الوالدين'}</div>
      <div class="report-title">${title}</div>
      <div class="date-badge">تاريخ التقرير: ${formatDateEn(new Date())} | إجمالي الطلاب: ${formatNumberEn(students.length)} طالب</div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 5%;">م</th>
          <th style="width: 22%;">اسم الطالب</th>
          <th style="width: 15%;">الحلقة</th>
          <th style="width: 13%;">جوال الولي</th>
          <th style="width: 10%;">رمز المرور</th>
          <th style="width: 10%;">المحفوظ</th>
          <th style="width: 8%;">النسبة</th>
          <th style="width: 8%;">الأجزاء</th>
          <th style="width: 15%;">آخر موضع تسميع</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;

  const fileName = options.className
    ? `بيان_طلاب_${options.className.replace(/\s+/g, '_')}.doc`
    : `التقرير_الشامل_لطلاب_التحفيظ.doc`;

  downloadDocFile(contentHtml, fileName);
}

/**
 * Export Attendance Records to Google Docs / Word formatted file
 */
export function exportAttendanceToDoc(
  records: AttendanceRecord[],
  options: { className?: string; date?: string } = {}
) {
  const adminSettings = getAdminSettings();
  const statusLabels: Record<string, { text: string; css: string }> = {
    present: { text: 'حاضر', css: 'badge-present' },
    late: { text: 'متأخر', css: 'badge-late' },
    excused: { text: 'مستأذن', css: 'badge-excused' },
    absent: { text: 'غائب', css: 'badge-absent' },
  };

  const rowsHtml = records
    .map((record, idx) => {
      const st = statusLabels[record.status] || { text: record.status, css: 'badge-present' };
      return `
      <tr>
        <td style="text-align:center;">${formatNumberEn(idx + 1)}</td>
        <td><strong>${record.studentName}</strong></td>
        <td>${record.halaqahName || options.className || 'عامة'}</td>
        <td style="text-align:center;">${record.date}</td>
        <td style="text-align:center;"><span class="badge ${st.css}">${st.text}</span></td>
        <td>${record.notes || '—'}</td>
      </tr>
    `;
    })
    .join('');

  const classLabel = options.className || 'جميع الحلقات';
  const dateLabel = options.date || new Date().toISOString().split('T')[0];

  const contentHtml = `
    <div class="header-box">
      <div class="mosque-title">${adminSettings.mosqueName || 'جامع الوالدين'}</div>
      <div class="report-title">سجل تحضير الطلاب - ${classLabel}</div>
      <div class="date-badge">التاريخ: ${dateLabel} | عدد السجلات: ${formatNumberEn(records.length)}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 6%;">م</th>
          <th style="width: 28%;">اسم الطالب</th>
          <th style="width: 20%;">الحلقة</th>
          <th style="width: 14%;">التاريخ</th>
          <th style="width: 12%;">الحالة</th>
          <th style="width: 20%;">الملاحظات</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;

  const fileName = `سجل_تحضير_${classLabel.replace(/\s+/g, '_')}_${dateLabel}.doc`;
  downloadDocFile(contentHtml, fileName);
}

/**
 * Export Individual Student Detailed Report Card to Google Docs / Word
 */
export function exportSingleStudentReportToDoc(student: Student) {
  const adminSettings = getAdminSettings();
  const stats = calculateStudentStats(student.id);
  const studentLogs = getLogs(student.id);

  const logsRowsHtml = studentLogs
    .map((log, idx) => {
      const typeLabel =
        log.type === 'combined'
          ? 'حفظ + مراجعة'
          : log.type === 'hifz'
          ? 'حفظ جديد'
          : 'مراجعة وتثبيت';

      return `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td style="text-align:center;">${log.date}</td>
        <td style="text-align:center;">${typeLabel}</td>
        <td>${log.surahName} (${log.startAyah} - ${log.endAyah})</td>
        <td style="text-align:center; font-weight:bold;">${log.ayahsCount}</td>
        <td style="text-align:center; color:#065f46; font-weight:bold;">${log.teacherGrade || 'ممتاز'}</td>
        <td>${log.teacherNotes || '—'}</td>
      </tr>
    `;
    })
    .join('');

  const contentHtml = `
    <div class="header-box">
      <div class="mosque-title">${adminSettings.mosqueName || 'جامع الوالدين'}</div>
      <div class="report-title">التقرير الفردي الشامل لإنجاز الطالب</div>
      <div class="date-badge">تاريخ الإصدار: ${formatDateEn(new Date())}</div>
    </div>

    <div class="card">
      <h3 style="margin-top:0; color:#065f46; font-size:15px; border-bottom:1px solid #e7e5e4; padding-bottom:6px;">البيانات الأساسية وإحصائيات الإنجاز</h3>
      <table style="margin:8px 0; font-size:13px;">
        <tr>
          <td style="width:25%; font-weight:bold; background-color:#f5f5f4;">اسم الطالب:</td>
          <td style="width:25%;">${student.fullName}</td>
          <td style="width:25%; font-weight:bold; background-color:#f5f5f4;">الحلقة / الفصل:</td>
          <td style="width:25%;">${student.halaqahName || 'حلقة عامة'}</td>
        </tr>
        <tr>
          <td style="font-weight:bold; background-color:#f5f5f4;">جوال ولي الأمر:</td>
          <td dir="ltr">${student.rawPhoneNumber || '—'}</td>
          <td style="font-weight:bold; background-color:#f5f5f4;">رمز الدخول:</td>
          <td style="font-weight:600;">${student.passwordPin || '—'}</td>
        </tr>
        <tr>
          <td style="font-weight:bold; background-color:#f5f5f4;">إجمالي الآيات المحفوظة:</td>
          <td style="color:#065f46; font-weight:bold;">${formatNumberEn(stats.totalMemorizedAyahs)} آية</td>
          <td style="font-weight:bold; background-color:#f5f5f4;">نسبة إنجاز المصحف:</td>
          <td style="color:#065f46; font-weight:bold;">${formatNumberEn(stats.memorizedPercentage)}%</td>
        </tr>
        <tr>
          <td style="font-weight:bold; background-color:#f5f5f4;">الأجزاء المكتملة:</td>
          <td>${formatNumberEn(stats.completedAjzaCount)} من 30 جزءاً</td>
          <td style="font-weight:bold; background-color:#f5f5f4;">آيات المراجعة والتثبيت:</td>
          <td>${formatNumberEn(stats.totalReviewedAyahs)} آية</td>
        </tr>
      </table>
    </div>

    <h3 style="color:#065f46; font-size:15px; margin-top:20px; margin-bottom:8px;">سجل جلسات التسميع المعتمدة (${formatNumberEn(studentLogs.length)} جلسة)</h3>
    <table>
      <thead>
        <tr>
          <th style="width: 5%;">م</th>
          <th style="width: 14%;">التاريخ</th>
          <th style="width: 14%;">نوع الجلسة</th>
          <th style="width: 25%;">الموضع والآيات</th>
          <th style="width: 10%;">الآيات</th>
          <th style="width: 12%;">التقييم</th>
          <th style="width: 20%;">ملاحظات المعلم</th>
        </tr>
      </thead>
      <tbody>
        ${logsRowsHtml || '<tr><td colspan="7" style="text-align:center; color:#78716c;">لا توجد جلسات مسجلة بعد</td></tr>'}
      </tbody>
    </table>
  `;

  const fileName = `تقرير_الطالب_${student.fullName.replace(/\s+/g, '_')}.doc`;
  downloadDocFile(contentHtml, fileName);
}
