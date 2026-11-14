import { SURAH_LIST } from '../data/quranData';
import { saveLog, getLogs } from './storage';
import { SessionLog } from '../types';

export const SCHOOL_GRADES = [
  'الصف الأول الابتدائي',
  'الصف الثاني الابتدائي',
  'الصف الثالث الابتدائي',
  'الصف الرابع الابتدائي',
  'الصف الخامس الابتدائي',
  'الصف السادس الابتدائي',
  'الصف الأول المتوسط',
  'الصف الثاني المتوسط',
  'الصف الثالث المتوسط',
  'الصف الأول الثانوي',
  'الصف الثاني الثانوي',
  'الصف الثالث الثانوي',
] as const;

export const ADULT_STAGES = [
  'جامعي',
  'موظف',
  'متقاعد',
] as const;

export const GRADES_LIST = [
  ...SCHOOL_GRADES,
  ...ADULT_STAGES,
] as const;

/**
 * Checks whether a given stage is an adult stage (جامعي, موظف/موضف, متقاعد).
 * Adult stages do NOT auto-upgrade on August 1st; instead, the registrant's age is upgraded.
 */
export function isAdultStage(stage?: string | null): boolean {
  if (!stage) return false;
  const s = stage.trim();
  return (
    s === 'جامعي' ||
    s === 'موظف' ||
    s === 'موضف' ||
    s === 'متقاعد' ||
    s === 'المرحلة الجامعية / كبار'
  );
}

/**
 * Normalizes adult stage name for display
 */
export function normalizeStageName(stage?: string | null): string {
  if (!stage) return 'غير محدد';
  const s = stage.trim();
  if (s === 'موضف') return 'موظف';
  if (s === 'المرحلة الجامعية / كبار') return 'جامعي';
  return s;
}

/**
 * Calculates student's current grade with automatic promotion every August 1st.
 * Example: If enrolled in 'الصف الأول الابتدائي' on 2026-05-15,
 * on 2026-08-01 they advance to 'الصف الثاني الابتدائي'.
 * 
 * IMPORTANT: If stage is adult (جامعي, موظف, متقاعد), it is KEPT THE SAME (no grade promotion).
 */
export function calculateCurrentGrade(
  registeredGrade?: string,
  assignedDateStr?: string,
  targetDate: Date = new Date()
): { currentGrade: string; isUpgraded: boolean; upgradeCount: number } {
  if (!registeredGrade) {
    return { currentGrade: 'غير محدد', isUpgraded: false, upgradeCount: 0 };
  }

  // Adult stages: keep unchanged!
  if (isAdultStage(registeredGrade)) {
    return { currentGrade: normalizeStageName(registeredGrade), isUpgraded: false, upgradeCount: 0 };
  }

  const gradeIndex = SCHOOL_GRADES.indexOf(registeredGrade as any);
  if (gradeIndex === -1) {
    return { currentGrade: registeredGrade, isUpgraded: false, upgradeCount: 0 };
  }

  const assignedDate = assignedDateStr ? new Date(assignedDateStr) : new Date();
  if (isNaN(assignedDate.getTime())) {
    return { currentGrade: registeredGrade, isUpgraded: false, upgradeCount: 0 };
  }

  let upgradeCount = 0;
  const startYear = assignedDate.getFullYear();
  const currentYear = targetDate.getFullYear();

  // Check every year from startYear up to currentYear
  for (let year = startYear; year <= currentYear; year++) {
    // August 1st of this year
    const augustFirst = new Date(year, 7, 1); // Month 7 is August in JS Date (0-indexed)

    // Rollover applies if assignedDate was BEFORE this August 1st AND targetDate is ON OR AFTER this August 1st
    if (assignedDate < augustFirst && targetDate >= augustFirst) {
      upgradeCount++;
    }
  }

  const newIndex = Math.min(gradeIndex + upgradeCount, SCHOOL_GRADES.length - 1);
  const currentGrade = SCHOOL_GRADES[newIndex];

  return {
    currentGrade,
    isUpgraded: upgradeCount > 0,
    upgradeCount,
  };
}

/**
 * Calculates student's current age with automatic increment every August 1st.
 * Per requirement: For adult stages (جامعي, موظف, متقاعد), ask for age,
 * and every August 1st upgrade the age to the next year.
 */
export function calculateCurrentAge(
  registeredAge?: number,
  assignedDateStr?: string,
  targetDate: Date = new Date()
): { currentAge: number | undefined; isUpgraded: boolean; upgradeCount: number } {
  if (registeredAge === undefined || registeredAge === null || isNaN(registeredAge) || registeredAge <= 0) {
    return { currentAge: undefined, isUpgraded: false, upgradeCount: 0 };
  }

  const assignedDate = assignedDateStr ? new Date(assignedDateStr) : new Date();
  if (isNaN(assignedDate.getTime())) {
    return { currentAge: registeredAge, isUpgraded: false, upgradeCount: 0 };
  }

  let upgradeCount = 0;
  const startYear = assignedDate.getFullYear();
  const currentYear = targetDate.getFullYear();

  for (let year = startYear; year <= currentYear; year++) {
    const augustFirst = new Date(year, 7, 1);
    if (assignedDate < augustFirst && targetDate >= augustFirst) {
      upgradeCount++;
    }
  }

  return {
    currentAge: registeredAge + upgradeCount,
    isUpgraded: upgradeCount > 0,
    upgradeCount,
  };
}

/**
 * Student initial enrollment handler.
 * Per requirement: Do NOT generate fake memorization logs on registration.
 * Keep logs empty until the teacher verifies and records sessions.
 */
export function initializeStudentBaselineMemorization(
  _studentId: string,
  _studentName: string,
  _lastSurahNumber: number,
  _registrationDate: string = new Date().toISOString()
) {
  // Empty by design: logs must only be created through teacher verification sessions.
  return;
}
