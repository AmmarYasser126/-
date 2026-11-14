import { db } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { toEnglishDigits } from './format';
import { getAdminSettings } from './storage';

export interface PhoneValidationResult {
  isValid: boolean;
  cleanDigits: string;
  formattedLocal: string;
  formattedIntl: string;
  error?: string;
}

/**
 * Validates Saudi mobile numbers strictly:
 * - Must only contain digits (0-9).
 * - Must start with '05'.
 * - Must be exactly 10 digits (e.g., 05XXXXXXXX).
 */
export function validateSaudiMobile(rawPhone: string): PhoneValidationResult {
  const english = toEnglishDigits(rawPhone).trim();
  const digitsOnly = english.replace(/\D/g, '');

  if (!digitsOnly) {
    return {
      isValid: false,
      cleanDigits: '',
      formattedLocal: '',
      formattedIntl: '',
      error: 'يرجى إدخال رقم الجوال',
    };
  }

  // Handle international prefix (+966 or 00966 or 966)
  let normalized = digitsOnly;
  if (normalized.startsWith('00966')) normalized = '0' + normalized.slice(5);
  else if (normalized.startsWith('966')) normalized = '0' + normalized.slice(3);

  // Must start with 05
  if (!normalized.startsWith('05')) {
    return {
      isValid: false,
      cleanDigits: digitsOnly,
      formattedLocal: normalized,
      formattedIntl: '',
      error: 'رقم غير صحيح: يجب أن يبدأ رقم الجوال بـ 05',
    };
  }

  // Must be exactly 10 digits
  if (normalized.length !== 10) {
    return {
      isValid: false,
      cleanDigits: digitsOnly,
      formattedLocal: normalized,
      formattedIntl: '',
      error: `رقم الجوال غير مكتمل: يتكون من ${normalized.length} أرقام والمطلوب 10 أرقام بالضبط (يبدأ بـ 05)`,
    };
  }

  const formattedIntl = '+966' + normalized.slice(1);

  return {
    isValid: true,
    cleanDigits: normalized,
    formattedLocal: normalized,
    formattedIntl: formattedIntl,
  };
}

export interface SendPinResult {
  success: boolean;
  phoneNumber: string;
  pin?: string;
  whatsappUrl?: string;
  officialWhatsappUrl?: string;
  parentWhatsappUrl?: string;
  officialSenderPhone?: string;
  dispatchedToCarrier?: boolean;
  provider?: string | null;
  carrierError?: string | null;
  hasSmsConfigured?: boolean;
  error?: string;
}

/**
 * Builds the official WhatsApp direct chat URL with pre-filled PIN verification message.
 * - If target is 'official': Opens WhatsApp chat with the Mosque's official WhatsApp number (configured in Admin settings).
 * - If target is 'parent': Opens WhatsApp message addressed directly to the parent's phone number.
 */
export function buildParentWhatsappPinUrl(
  rawPhone: string,
  pin: string,
  target: 'parent' | 'official' = 'parent'
): string {
  const adminSettings = getAdminSettings();
  const mosqueName = adminSettings.mosqueName || 'جامع الوالدين';
  const officialPhone = adminSettings.officialSenderPhone || adminSettings.adminContactPhone || '0555555555';

  const validation = validateSaudiMobile(rawPhone);
  const cleanPhone = validation.cleanDigits || rawPhone.replace(/\D/g, '');
  const intlParent = cleanPhone.startsWith('0') ? '966' + cleanPhone.slice(1) : cleanPhone;

  const cleanOfficial = officialPhone.replace(/\D/g, '');
  const intlOfficial = cleanOfficial.startsWith('0') ? '966' + cleanOfficial.slice(1) : cleanOfficial;

  if (target === 'parent') {
    const text = 
`🕌 *${mosqueName} - بوابة متابعة الأبناء*
المرسل: إدارة المجمع بالرقم المعتمد (${officialPhone})
المستلم: ولي أمر الطالب (${rawPhone})

السلام عليكم ورحمة الله وبركاته،
رمز التحقق السريع (PIN) للدخول إلى بوابة متابعة الأبناء بجامع الوالدين هو:
🔢 *${pin}*

⚠️ هذا الرمز صالح للاستخدام لمدة 10 دقائق.`;

    return `https://api.whatsapp.com/send?phone=${intlParent}&text=${encodeURIComponent(text)}`;
  } else {
    const text = 
`🕌 *${mosqueName} - بوابة متابعة الأبناء*
السلام عليكم ورحمة الله وبركاته،
أنا ولي أمر الطالب المسجل برقم الجوال: ${rawPhone}
أطلب رمز التحقق للدخول إلى بوابة متابعة الأبناء وحلقات القرآن الكريم.

🔑 رمز التحقق المطلوب للجلسة: *${pin}*`;

    return `https://api.whatsapp.com/send?phone=${intlOfficial}&text=${encodeURIComponent(text)}`;
  }
}

/**
 * Builds a direct WhatsApp chat URL for any Saudi phone number and custom text.
 */
export function buildWhatsappDirectMessageUrl(rawPhone: string, message: string): string {
  const digits = toEnglishDigits(rawPhone).replace(/\D/g, '');
  const intlNumber = digits.startsWith('0') ? '966' + digits.slice(1) : digits;
  return `https://wa.me/${intlNumber}?text=${encodeURIComponent(message)}`;
}

/**
 * Sends a real 4-digit PIN to the parent's WhatsApp.
 * Saves record in Firestore collection 'parentVerifications' with 10-minute expiry.
 */
export async function sendParentWhatsappPin(rawPhone: string): Promise<SendPinResult> {
  const validation = validateSaudiMobile(rawPhone);
  if (!validation.isValid) {
    return {
      success: false,
      phoneNumber: rawPhone,
      error: validation.error || 'رقم جوال غير صالح: يجب أن يبدأ بـ 05 ويتكون من 10 أرقام',
    };
  }

  const phone = validation.formattedLocal;
  const pin = Math.floor(1000 + Math.random() * 9000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  
  const officialWhatsappUrl = buildParentWhatsappPinUrl(phone, pin, 'official');
  const parentWhatsappUrl = buildParentWhatsappPinUrl(phone, pin, 'parent');
  const adminSettings = getAdminSettings();
  const officialSenderPhone = adminSettings.officialSenderPhone || '0555555555';

  // 1. Store in Firestore
  try {
    await setDoc(doc(db, 'parentVerifications', phone), {
      phoneNumber: phone,
      intlPhone: validation.formattedIntl,
      pin: pin,
      officialSenderPhone: officialSenderPhone,
      channel: 'whatsapp',
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt,
      verified: false,
    });
  } catch (err) {
    console.warn('Firestore parentVerifications write warning:', err);
  }

  // 2. Also attempt server-side gateway if configured
  let dispatchedToCarrier = false;
  let provider: string | null = null;
  let carrierError: string | null = null;
  let hasSmsConfigured = false;

  try {
    const res = await fetch('/api/send-parent-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: phone,
        intlPhone: validation.formattedIntl,
        pin: pin,
        officialSenderPhone,
        channel: 'whatsapp',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      dispatchedToCarrier = Boolean(data.dispatchedToCarrier);
      provider = data.provider || null;
      carrierError = data.carrierError || null;
      hasSmsConfigured = Boolean(data.hasSmsConfigured);
    }
  } catch (apiErr) {
    console.warn('Server endpoint dispatch warning:', apiErr);
  }

  return {
    success: true,
    phoneNumber: phone,
    pin: pin,
    whatsappUrl: officialWhatsappUrl,
    officialWhatsappUrl,
    parentWhatsappUrl,
    officialSenderPhone,
    dispatchedToCarrier,
    provider,
    carrierError,
    hasSmsConfigured,
  };
}

/**
 * Sends a real 4-digit PIN to the parent's phone number via SMS.
 * Saves record in Firestore collection 'parentVerifications' with 10-minute expiry.
 */
export async function sendParentSmsPin(rawPhone: string): Promise<SendPinResult> {
  const validation = validateSaudiMobile(rawPhone);
  if (!validation.isValid) {
    return {
      success: false,
      phoneNumber: rawPhone,
      error: validation.error || 'رقم جوال غير صالح',
    };
  }

  const phone = validation.formattedLocal;
  const pin = Math.floor(1000 + Math.random() * 9000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // 1. Store in Firestore
  try {
    await setDoc(doc(db, 'parentVerifications', phone), {
      phoneNumber: phone,
      intlPhone: validation.formattedIntl,
      pin: pin,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt,
      verified: false,
    });
  } catch (err) {
    console.warn('Firestore parentVerifications write warning:', err);
  }

  // 2. Call server-side SMS dispatch endpoint (Taqnyat / Twilio / SMS Gateway)
  let dispatchedToCarrier = false;
  let provider: string | null = null;
  let carrierError: string | null = null;
  let hasSmsConfigured = false;

  try {
    const res = await fetch('/api/send-parent-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: phone,
        intlPhone: validation.formattedIntl,
        pin: pin,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      console.log('SMS dispatch API result:', data);
      dispatchedToCarrier = Boolean(data.dispatchedToCarrier);
      provider = data.provider || null;
      carrierError = data.carrierError || null;
      hasSmsConfigured = Boolean(data.hasSmsConfigured);
    }
  } catch (apiErr) {
    console.warn('Server SMS endpoint dispatch warning:', apiErr);
  }

  return {
    success: true,
    phoneNumber: phone,
    pin: pin,
    dispatchedToCarrier,
    provider,
    carrierError,
    hasSmsConfigured,
  };
}

/**
 * Verifies the 4-digit PIN against Firestore and local state.
 */
export async function verifyParentPinCode(
  rawPhone: string,
  enteredPin: string,
  localSavedPin?: string
): Promise<{ success: boolean; error?: string }> {
  const validation = validateSaudiMobile(rawPhone);
  const phone = validation.cleanDigits || rawPhone.replace(/\D/g, '');
  const cleanEntered = toEnglishDigits(enteredPin).trim();

  if (!cleanEntered || cleanEntered.length !== 4) {
    return {
      success: false,
      error: 'يرجى إدخال رمز التحقق المكون من 4 أرقام كاملاً',
    };
  }

  // Match against memory pin first
  if (localSavedPin && cleanEntered === localSavedPin) {
    return { success: true };
  }

  // Check Firestore
  try {
    const snap = await getDoc(doc(db, 'parentVerifications', phone));
    if (snap.exists()) {
      const data = snap.data();
      const expiresAt = data.expiresAt ? new Date(data.expiresAt).getTime() : 0;
      if (Date.now() > expiresAt) {
        return {
          success: false,
          error: 'انتهت صلاحية رمز التحقق (صالح لمدة 10 دقائق)، يرجى طلب رمز جديد',
        };
      }
      if (data.pin === cleanEntered) {
        return { success: true };
      }
    }
  } catch (err) {
    console.warn('Firestore verify lookup error:', err);
  }

  return {
    success: false,
    error: 'رمز التحقق غير صحيح، يرجى التأكد من الرمز المكون من 4 أرقام المستلم في تطبيق واتساب',
  };
}
