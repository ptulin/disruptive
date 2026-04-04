import { getBossConfig, parseCookies, verifyBossCookie } from './_boss.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');

  try {
    const { secret } = getBossConfig();
    const cookies = parseCookies(req.headers.cookie || '');
    const authenticated = verifyBossCookie(cookies.boss_session, secret);
    return res.status(200).json({ success: true, authenticated });
  } catch (error) {
    return res.status(200).json({ success: true, authenticated: false });
  }
}
