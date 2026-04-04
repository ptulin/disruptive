const DEFAULT_TO = 'p.tulin@gmail.com';
const GASCONY_TO = 'p.tulin@gmail.com';
const ALLOWED_INTERESTS = new Set([
  'AI / product strategy',
  'UX / research / consulting',
  'AI tools / partnership inquiry',
  'Archives / samples / speaking',
  'Taste of Gascony / travel inquiry',
]);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { name, email, company = '', interest, message, source = 'disruptiveexperience.com' } = req.body || {};

  if (!name || !email || !interest || !message) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email address' });
  }

  if (!ALLOWED_INTERESTS.has(interest)) {
    return res.status(400).json({ success: false, error: 'Invalid interest value' });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return res.status(503).json({ success: false, error: 'RESEND_API_KEY is not configured' });
  }

  const primaryTo = process.env.CONTACT_TO_EMAIL || DEFAULT_TO;
  const gasconyTo = process.env.TASTE_OF_GASCONY_TO_EMAIL || GASCONY_TO;
  const to = interest === 'Taste of Gascony / travel inquiry' ? gasconyTo : primaryTo;
  const from = process.env.CONTACT_FROM_EMAIL || 'Disruptive Experience <noreply@disruptiveexperience.com>';

  const subject = `[Disruptive Experience] ${interest} — ${name}`;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #23170f;">
      <h2 style="margin-bottom: 12px;">New inquiry from disruptiveexperience.com</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Company:</strong> ${escapeHtml(company || '—')}</p>
      <p><strong>Interest:</strong> ${escapeHtml(interest)}</p>
      <p><strong>Source:</strong> ${escapeHtml(source)}</p>
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
      <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
    </div>
  `;

  const text = [
    'New inquiry from disruptiveexperience.com',
    `Name: ${name}`,
    `Email: ${email}`,
    `Company: ${company || '—'}`,
    `Interest: ${interest}`,
    `Source: ${source}`,
    '',
    message,
  ].join('\n');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: email,
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return res.status(502).json({ success: false, error: errorText || 'Failed to send email' });
  }

  return res.status(200).json({ success: true });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
