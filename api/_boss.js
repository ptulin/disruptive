import crypto from 'node:crypto';

const HOMEPAGE_URL = 'https://disruptiveexperience.com/';
const HOME_EVENTS = [
  '$pageview',
  '$pageleave',
  'cta_click',
  'destination_click',
  'venture_click',
  'form_started',
  'form_submit_success',
  'contact_email_click',
  'outbound_link_click',
  'interest_selected',
  'section_view',
];

export function getBossConfig() {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const password = process.env.BOSS_DASHBOARD_PASSWORD;
  const secret = process.env.BOSS_SESSION_SECRET;

  if (!apiKey || !projectId || !password || !secret) {
    throw new Error('Missing boss dashboard environment variables');
  }

  return { apiKey, projectId, password, secret };
}

export function createBossCookie(secret) {
  const expiresAt = Date.now() + 1000 * 60 * 60 * 12;
  const payload = String(expiresAt);
  const signature = signValue(payload, secret);
  return `${payload}.${signature}`;
}

export function verifyBossCookie(cookieValue, secret) {
  if (!cookieValue) return false;

  const [payload, signature] = String(cookieValue).split('.');
  if (!payload || !signature) return false;
  if (!timingSafeEqual(signature, signValue(payload, secret))) return false;

  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  return true;
}

export function parseCookies(header = '') {
  return header
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const index = part.indexOf('=');
      if (index === -1) return acc;
      const key = part.slice(0, index);
      const value = decodeURIComponent(part.slice(index + 1));
      acc[key] = value;
      return acc;
    }, {});
}

export function getRangeDays(range = '30d') {
  if (range === '7d') return 7;
  if (range === '90d') return 90;
  return 30;
}

export function normalizeRange(range = '30d') {
  return ['7d', '30d', '90d'].includes(range) ? range : '30d';
}

export function normalizeFocus(focus = 'all') {
  return ['all', 'traffic', 'cta', 'destination', 'venture', 'contact', 'outbound'].includes(focus)
    ? focus
    : 'all';
}

export function getFocusEvents(focus = 'all') {
  const map = {
    all: ['$pageview', 'cta_click', 'destination_click', 'venture_click', 'form_started', 'form_submit_success', 'contact_email_click', 'outbound_link_click'],
    traffic: ['$pageview'],
    cta: ['cta_click'],
    destination: ['destination_click'],
    venture: ['venture_click'],
    contact: ['form_started', 'form_submit_success', 'contact_email_click'],
    outbound: ['outbound_link_click'],
  };

  return map[focus] || map.all;
}

export function normalizeEventName(event) {
  const names = {
    '$pageview': 'Homepage view',
    cta_click: 'CTA click',
    destination_click: 'Destination click',
    venture_click: 'Venture click',
    form_started: 'Form started',
    form_submit_success: 'Form submitted',
    contact_email_click: 'Email click',
    outbound_link_click: 'Outbound click',
    interest_selected: 'Interest selected',
    section_view: 'Section viewed',
  };

  return names[event] || event;
}

export function normalizeTargetCase(scope = 'properties') {
  return `
    multiIf(
      notEmpty(${scope}.target_name), ${scope}.target_name,
      positionCaseInsensitiveUTF8(${scope}.href, 'aitools.disruptiveexperience.com') > 0, 'AI Tools',
      positionCaseInsensitiveUTF8(${scope}.href, 'pawel.disruptiveexperience.com') > 0, 'Pawel',
      positionCaseInsensitiveUTF8(${scope}.href, 'archives.disruptiveexperience.com') > 0, 'Archives',
      positionCaseInsensitiveUTF8(${scope}.href, 'pavotu.disruptiveexperience.com') > 0, 'Pavotu',
      positionCaseInsensitiveUTF8(${scope}.href, 'tasteofgascony.com') > 0, 'Taste of Gascony',
      positionCaseInsensitiveUTF8(${scope}.label, 'Start a project') > 0, 'Start a project',
      positionCaseInsensitiveUTF8(${scope}.label, 'Explore the ecosystem') > 0, 'Explore the ecosystem',
      positionCaseInsensitiveUTF8(${scope}.label, 'Open tools directory') > 0, 'AI Tools',
      positionCaseInsensitiveUTF8(${scope}.label, 'View portfolio') > 0, 'Pawel',
      positionCaseInsensitiveUTF8(${scope}.label, 'Browse archive') > 0, 'Archives',
      positionCaseInsensitiveUTF8(${scope}.label, 'Explore Pavotu') > 0, 'Pavotu',
      positionCaseInsensitiveUTF8(${scope}.label, 'Visit Taste of Gascony') > 0, 'Taste of Gascony',
      notEmpty(${scope}.interest), ${scope}.interest,
      notEmpty(${scope}.section_name), ${scope}.section_name,
      notEmpty(${scope}.section_id), ${scope}.section_id,
      'Other'
    )
  `;
}

export async function runBossQuery(query) {
  const { apiKey, projectId } = getBossConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  let response;

  try {
    response = await fetch(`https://us.posthog.com/api/projects/${projectId}/query/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        query: {
          kind: 'HogQLQuery',
          query,
        },
      }),
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'PostHog query failed');
  }

  return response.json();
}

export function buildBossResponse(data) {
  return {
    homepageUrl: HOMEPAGE_URL,
    ...data,
  };
}

export function homepageFilter(alias = 'properties') {
  return `(event NOT IN ('$pageview', '$pageleave') OR ${alias}.$current_url = '${HOMEPAGE_URL}')`;
}

export function homeEventsList() {
  return HOME_EVENTS.map((event) => `'${event}'`).join(', ');
}

function signValue(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

function timingSafeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
