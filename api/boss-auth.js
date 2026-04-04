import crypto from 'node:crypto';
import { createBossCookie, getBossConfig } from './_boss.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { password = '' } = req.body || {};
    const { password: expectedPassword, secret } = getBossConfig();

    if (!safeCompare(String(password).trim(), String(expectedPassword).trim())) {
      return res.status(401).json({ success: false, error: 'Wrong password' });
    }

    const session = createBossCookie(secret);
    res.setHeader(
      'Set-Cookie',
      `boss_session=${encodeURIComponent(session)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unable to authenticate',
    });
  }
}

function safeCompare(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
