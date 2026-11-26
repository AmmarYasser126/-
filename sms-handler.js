// Shared handler for POST /api/send-parent-pin.
// Used by the Vite dev server (vite.config.ts) and the production server (server.js).
// Credentials come only from environment variables: TAQNYAT_BEARER_TOKEN, TAQNYAT_SENDER_NAME,
// TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER.

/**
 * @param {{ phoneNumber?: string, intlPhone?: string, pin?: string }} data
 * @returns {Promise<{ status: number, body: Record<string, unknown> }>}
 */
export async function handleSendParentPin(data) {
  const { phoneNumber, intlPhone, pin } = data || {};

  if (!phoneNumber || !pin) {
    return { status: 400, body: { error: 'Missing phone or pin' } };
  }

  const cleanDigits = String(phoneNumber).replace(/\D/g, '');
  if (!cleanDigits.startsWith('05') || cleanDigits.length !== 10) {
    return { status: 400, body: { error: 'Invalid Saudi mobile number: must start with 05 and be 10 digits' } };
  }

  const smsMessage = `جامع الوالدين: رمز التحقق السريع الخاص بك للدخول هو: ${pin} (صالح لمدة 10 دقائق)`;
  let dispatched = false;
  let provider = '';
  let carrierError = '';

  // 1. Taqnyat Provider (Saudi Arabia - https://taqnyat.sa)
  const taqnyatToken = process.env.TAQNYAT_BEARER_TOKEN;
  if (taqnyatToken) {
    try {
      const taqnyatRecipient = `966${cleanDigits.slice(1)}`;
      const senderName = process.env.TAQNYAT_SENDER_NAME || 'TAQNYAT';
      const taqnyatRes = await fetch('https://api.taqnyat.sa/v1/messages', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${taqnyatToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients: [taqnyatRecipient],
          body: smsMessage,
          sender: senderName,
        }),
      });
      const result = await taqnyatRes.json();
      console.log('Taqnyat SMS response:', result);
      if (result.statusCode === 201 || result.statusCode === 200 || result.status === 'success') {
        dispatched = true;
        provider = 'Taqnyat (تقنيات)';
      } else if (result.statusCode === 403 || String(result.message).includes('Not authorized') || result?.Error?.ErrorCode === 102) {
        const rawMsg = String(result.message || result?.Error?.MessageAr || result?.Error?.MessageEn || '');
        const ipMatch = rawMsg.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/);
        const ipStr = ipMatch ? ` (الـ IP المطلوب إضافته: ${ipMatch[0]})` : '';
        carrierError = `مفتاح تقنيات مفعّل، ولكن يلزم السماح لعنوان الخادم${ipStr} في لوحة تقنيات -> المطورين Developers -> إعدادات الأمان Security Settings (قم بإلغاء تقييد IP أو إضافة العنوان).`;
      } else if (String(result.message).toLowerCase().includes('sender') && String(result.message).toLowerCase().includes('not activated')) {
        carrierError = 'تم الاتصال بحسابك في تقنيات بنجاح والرصيد متوفر (1 ريال / 7 نقاط)! يتبقى تفعيل أو تزويدنا بـ (اسم المرسل - Sender Name) المعتمد في حسابك لدى تقنيات.';
      } else {
        carrierError = result.message || result?.Error?.MessageAr || 'فشل الإرسال عبر تقنيات';
      }
    } catch (err) {
      console.error('Taqnyat dispatch error:', err);
      carrierError = err?.message || 'تعذر الاتصال بخادم تقنيات';
    }
  }

  // 2. Twilio Provider
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_FROM_NUMBER;
  if (!dispatched && twilioSid && twilioToken && twilioFrom) {
    try {
      const targetIntl = intlPhone || `+966${cleanDigits.slice(1)}`;
      const authHeader = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
      const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: targetIntl,
          From: twilioFrom,
          Body: smsMessage,
        }).toString(),
      });
      const result = await twilioRes.json();
      console.log('Twilio SMS response:', result);
      if (twilioRes.ok && result.sid) {
        dispatched = true;
        provider = 'Twilio';
      } else {
        carrierError = result.message || 'فشل الإرسال عبر Twilio';
      }
    } catch (err) {
      console.error('Twilio dispatch error:', err);
      carrierError = err?.message || 'تعذر الاتصال بخادم Twilio';
    }
  }

  return {
    status: 200,
    body: {
      success: true,
      phoneNumber: cleanDigits,
      dispatchedToCarrier: dispatched,
      provider: provider || null,
      carrierError: carrierError || null,
      hasSmsConfigured: Boolean(taqnyatToken || (twilioSid && twilioToken && twilioFrom)),
    },
  };
}
