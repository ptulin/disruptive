export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  res.setHeader(
    'Set-Cookie',
    'boss_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'
  );

  return res.status(200).json({ success: true });
}
