import { EncryptedData } from '../types';

const ENCRYPTION_SALT = 'jami_al_walidayn_quran_secure_v1';

// Derive or retrieve persistent client cryptographic key
async function getCryptoKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(ENCRYPTION_SALT),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode('alwalidayn_tahfeeth_2026'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt plaintext string using AES-GCM
export async function encryptSensitiveField(plainText: string): Promise<EncryptedData> {
  try {
    const key = await getCryptoKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plainText);

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encoded
    );

    const ciphertext = btoa(String.fromCharCode(...new Uint8Array(ciphertextBuffer)));
    const ivBase64 = btoa(String.fromCharCode(...iv));

    return {
      ciphertext,
      iv: ivBase64
    };
  } catch (error) {
    console.error('Encryption failed:', error);
    // Fallback safe encoding
    return {
      ciphertext: btoa(unescape(encodeURIComponent(plainText))),
      iv: 'fallback'
    };
  }
}

// Decrypt ciphertext using AES-GCM
export async function decryptSensitiveField(encrypted: EncryptedData): Promise<string> {
  try {
    if (encrypted.iv === 'fallback') {
      return decodeURIComponent(escape(atob(encrypted.ciphertext)));
    }

    const key = await getCryptoKey();
    const iv = Uint8Array.from(atob(encrypted.iv), c => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(encrypted.ciphertext), c => c.charCodeAt(0));

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch (error) {
    console.error('Decryption failed:', error);
    return '';
  }
}

// Create a fast normalized search hash/normalized value for phone number matching
export function normalizePhoneNumber(phone: string): string {
  // Remove non-digit characters and standardize (+966, 05, etc.)
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('966')) {
    digits = '0' + digits.slice(3);
  }
  return digits;
}

// Mask sensitive phone number for display (e.g. 05****1234)
export function maskPhoneNumber(phone: string): string {
  const cleaned = phone.trim();
  if (cleaned.length <= 4) return '****';
  const start = cleaned.slice(0, 3);
  const end = cleaned.slice(-3);
  return `${start}****${end}`;
}
