export interface ContactSubmission {
  name: string;
  email: string;
  interest?: string;
  message: string;
}

export const OWNER_EMAIL = process.env.ADMIN_EMAIL || 'aristeaamnta@gmail.com';
export const DEFAULT_SENDER = process.env.ORDER_NOTIFICATION_FROM || 'onboarding@resend.dev';

export async function sendContactEmail(submission: ContactSubmission, send = fetch) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error('Η υπηρεσία αποστολής email δεν είναι ρυθμισμένη στο σύστημα (λείπει το RESEND_API_KEY).');
  }

  const name = String(submission.name || '').trim();
  const email = String(submission.email || '').trim();
  const interest = String(submission.interest || '').trim();
  const message = String(submission.message || '').trim();

  if (!name) throw new Error('Παρακαλούμε συμπληρώστε το ονοματεπώνυμό σας.');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Παρακαλούμε συμπληρώστε μια έγκυρη διεύθυνση email.');
  }
  if (!message) throw new Error('Παρακαλούμε πληκτρολογήστε το μήνυμά σας.');

  const subject = interest
    ? `Εκδήλωση Ενδιαφέροντος / Ανάθεση: ${interest} (${name})`
    : `Μήνυμα Επικοινωνίας από ${name}`;

  const textLines = [
    'ΝΕΟ ΜΗΝΥΜΑ ΕΠΙΚΟΙΝΩΝΙΑΣ — ARAM CREATIONS',
    '====================================================',
    `Ονοματεπώνυμο: ${name}`,
    `Email απάντησης: ${email}`,
    `Θέμα: ${interest || 'Γενική Ανάθεση / Συνεργασία'}`,
    `Ημερομηνία: ${new Date().toLocaleString('el-GR', { timeZone: 'Europe/Athens' })}`,
    '',
    'ΜΗΝΥΜΑ:',
    '----------------------------------------------------',
    message,
    '',
    '====================================================',
    `Απαντήστε σε αυτό το email για άμεση επικοινωνία με τον αποστολέα (${email}).`
  ];

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #fafaf9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1c1917;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e7e5e4; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
    <div style="background: #0c0a09; padding: 28px 32px; border-bottom: 2px solid #292524;">
      <span style="font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: #a8a29e; font-weight: 700;">Aram Creations • Atelier Inquiries</span>
      <h1 style="color: #ffffff; margin: 8px 0 0 0; font-size: 21px; font-weight: 700; letter-spacing: -0.01em;">Νέο Μήνυμα Επικοινωνίας</h1>
    </div>
    
    <div style="padding: 32px;">
      <div style="background: #f5f5f4; border: 1px solid #e7e5e4; border-radius: 14px; padding: 18px 22px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #78716c; width: 130px; font-weight: 600;">Ονοματεπώνυμο:</td>
            <td style="padding: 6px 0; color: #1c1917; font-weight: 700;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #78716c; font-weight: 600;">Email απάντησης:</td>
            <td style="padding: 6px 0;"><a href="mailto:${email}" style="color: #0f766e; font-weight: 700; text-decoration: none;">${email}</a></td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #78716c; font-weight: 600;">Θέμα:</td>
            <td style="padding: 6px 0; color: #1c1917; font-weight: 600;">${interest || 'Γενική Ανάθεση / Συνεργασία'}</td>
          </tr>
        </table>
      </div>

      <div style="margin-bottom: 28px;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #78716c; font-weight: 700; margin-bottom: 10px;">Μήνυμα Πελάτη</div>
        <div style="background: #ffffff; border: 1px solid #d6d3d1; border-radius: 14px; padding: 20px; font-size: 14px; line-height: 1.65; color: #292524; white-space: pre-wrap;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      </div>

      <div style="text-align: center; padding-top: 8px;">
        <a href="mailto:${email}" style="display: inline-block; background: #0c0a09; color: #ffffff; text-decoration: none; padding: 13px 26px; border-radius: 12px; font-size: 13px; font-weight: 700; letter-spacing: 0.01em;">Απάντηση στον πελάτη (${email})</a>
      </div>
    </div>

    <div style="background: #f5f5f4; border-top: 1px solid #e7e5e4; padding: 16px 32px; text-align: center; font-size: 11px; color: #a8a29e;">
      Aram Creations Atelier • Αυτόματη ειδοποίηση ιστοσελίδας μέσω Resend
    </div>
  </div>
</body>
</html>`;

  const response = await send('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(10000),
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: `Aram Creations Atelier <${DEFAULT_SENDER}>`,
      to: [OWNER_EMAIL],
      reply_to: email,
      subject,
      text: textLines.join('\n'),
      html: htmlContent
    })
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || `Σφάλμα παρόχου Resend (HTTP ${response.status}).`);
  }

  const result = await response.json();
  return { id: String(result.id || '') };
}

