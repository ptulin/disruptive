import {
  buildBossResponse,
  getBossConfig,
  getFocusEvents,
  getRangeDays,
  homeEventsList,
  homepageFilter,
  normalizeFocus,
  normalizeEventName,
  normalizeRange,
  normalizeTargetCase,
  parseCookies,
  runBossQuery,
  verifyBossCookie,
} from './_boss.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');

  try {
    const { secret } = getBossConfig();
    const cookies = parseCookies(req.headers.cookie || '');

    if (!verifyBossCookie(cookies.boss_session, secret)) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const range = normalizeRange(String(req.query.range || '30d'));
    const focus = normalizeFocus(String(req.query.focus || 'all'));
    const day = req.query.day ? String(req.query.day) : '';
    const days = getRangeDays(range);
    const focusEvents = getFocusEvents(focus);
    const eventList = focusEvents.map((event) => `'${event}'`).join(', ');
    const normalizedTarget = normalizeTargetCase('properties');
    const dayFilter = day ? ` AND toDate(timestamp) = toDate('${escapeLiteral(day)}')` : '';

    const [
      summaryResult,
      timelineResult,
      referrerResult,
      countryResult,
      targetResult,
      interestResult,
      sectionResult,
      detailResult,
    ] = await Promise.all([
      runBossQuery(`
        SELECT
          countIf(event = '$pageview' AND properties.$current_url = 'https://disruptiveexperience.com/') AS views,
          uniqIf(person_id, event = '$pageview' AND properties.$current_url = 'https://disruptiveexperience.com/') AS visitors,
          round(avgIf(properties.$prev_pageview_duration, event = '$pageleave' AND properties.$current_url = 'https://disruptiveexperience.com/' AND properties.$prev_pageview_duration < 3600), 1) AS avg_seconds,
          countIf(event = 'cta_click') AS cta_clicks,
          countIf(event = 'destination_click') AS destination_clicks,
          countIf(event = 'venture_click') AS venture_clicks,
          countIf(event = 'form_started') AS form_starts,
          countIf(event = 'form_submit_success') AS form_submits,
          countIf(event = 'contact_email_click') AS email_clicks
        FROM events
        WHERE timestamp >= now() - INTERVAL ${days} DAY
          AND ${homepageFilter('properties')}
      `),
      runBossQuery(`
        SELECT
          toDate(timestamp) AS day,
          countIf(event = '$pageview' AND properties.$current_url = 'https://disruptiveexperience.com/') AS views,
          countIf(event = 'cta_click') AS cta_clicks,
          countIf(event = 'destination_click') AS destination_clicks,
          countIf(event = 'venture_click') AS venture_clicks,
          countIf(event = 'form_submit_success') AS form_submits
        FROM events
        WHERE timestamp >= now() - INTERVAL ${days} DAY
          AND event IN (${homeEventsList()})
          AND ${homepageFilter('properties')}
        GROUP BY day
        ORDER BY day ASC
      `),
      runBossQuery(`
        SELECT
          coalesce(nullIf(properties.$referring_domain, ''), 'Direct') AS referrer,
          count() AS visits
        FROM events
        WHERE event = '$pageview'
          AND properties.$current_url = 'https://disruptiveexperience.com/'
          AND timestamp >= now() - INTERVAL ${days} DAY
        GROUP BY referrer
        ORDER BY visits DESC
        LIMIT 8
      `),
      runBossQuery(`
        SELECT
          coalesce(nullIf(properties.$geoip_country_name, ''), 'Unknown') AS country,
          count() AS visits
        FROM events
        WHERE event = '$pageview'
          AND properties.$current_url = 'https://disruptiveexperience.com/'
          AND timestamp >= now() - INTERVAL ${days} DAY
        GROUP BY country
        ORDER BY visits DESC
        LIMIT 8
      `),
      runBossQuery(`
        SELECT
          ${normalizedTarget} AS target,
          count() AS clicks
        FROM events
        WHERE event IN ('cta_click', 'destination_click', 'venture_click', 'outbound_link_click')
          AND timestamp >= now() - INTERVAL ${days} DAY
        GROUP BY target
        ORDER BY clicks DESC
        LIMIT 8
      `),
      runBossQuery(`
        SELECT
          interest,
          count() AS total
        FROM
          (
            SELECT
              coalesce(nullIf(properties.interest, ''), 'Unspecified') AS interest
            FROM events
            WHERE event IN ('interest_selected', 'form_submit_success')
              AND timestamp >= now() - INTERVAL ${days} DAY
          )
        GROUP BY interest
        ORDER BY total DESC
        LIMIT 8
      `),
      runBossQuery(`
        SELECT
          coalesce(nullIf(properties.section_name, ''), nullIf(properties.section_id, ''), 'Unknown') AS section_name,
          count() AS views
        FROM events
        WHERE event = 'section_view'
          AND timestamp >= now() - INTERVAL ${days} DAY
        GROUP BY section_name
        ORDER BY views DESC
        LIMIT 8
      `),
      runBossQuery(`
        SELECT
          timestamp,
          event,
          ${normalizedTarget} AS target,
          coalesce(nullIf(properties.interest, ''), '') AS interest,
          coalesce(nullIf(properties.href, ''), '') AS href,
          coalesce(nullIf(properties.section_name, ''), nullIf(properties.section_id, ''), '') AS section_name,
          coalesce(nullIf(properties.$referring_domain, ''), 'Direct') AS referrer
        FROM events
        WHERE event IN (${eventList})
          AND timestamp >= now() - INTERVAL ${days} DAY
          AND ${homepageFilter('properties')}
          ${dayFilter}
        ORDER BY timestamp DESC
        LIMIT 50
      `),
    ]);

    const [summaryRow] = summaryResult.results || [];
    const summaryColumns = summaryResult.columns || [];
    const summary = Object.fromEntries(summaryColumns.map((column, index) => [column, summaryRow?.[index] || 0]));

    const timeline = mapRows(timelineResult).map((row) => ({
      day: row.day,
      views: Number(row.views || 0),
      ctaClicks: Number(row.cta_clicks || 0),
      destinationClicks: Number(row.destination_clicks || 0),
      ventureClicks: Number(row.venture_clicks || 0),
      formSubmits: Number(row.form_submits || 0),
    }));

    const details = mapRows(detailResult).map((row) => ({
      timestamp: row.timestamp,
      event: row.event,
      eventLabel: normalizeEventName(row.event),
      target: row.event === '$pageview' ? 'Homepage' : cleanLabel(row.target, 'Other'),
      interest: row.interest,
      href: row.href,
      sectionName: cleanLabel(row.section_name, '—'),
      referrer: cleanLabel(row.referrer, 'Direct'),
    }));

    return res.status(200).json({
      success: true,
      data: buildBossResponse({
        range,
        focus,
        day,
        summary: {
          views: Number(summary.views || 0),
          visitors: Number(summary.visitors || 0),
          avgSeconds: Number(summary.avg_seconds || 0),
          ctaClicks: Number(summary.cta_clicks || 0),
          destinationClicks: Number(summary.destination_clicks || 0),
          ventureClicks: Number(summary.venture_clicks || 0),
          formStarts: Number(summary.form_starts || 0),
          formSubmits: Number(summary.form_submits || 0),
          emailClicks: Number(summary.email_clicks || 0),
        },
        timeline,
        referrers: mapRows(referrerResult).map((row) => ({ label: cleanLabel(row.referrer, 'Direct'), value: Number(row.visits || 0) })),
        countries: mapRows(countryResult).map((row) => ({ label: cleanLabel(row.country), value: Number(row.visits || 0) })),
        targets: mapRows(targetResult).map((row) => ({ label: cleanLabel(row.target, 'Other'), value: Number(row.clicks || 0) })),
        interests: mapRows(interestResult).map((row) => ({ label: row.interest, value: Number(row.total || 0) })),
        sections: mapRows(sectionResult).map((row) => ({ label: cleanLabel(row.section_name), value: Number(row.views || 0) })),
        details,
      }),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unable to load dashboard data',
    });
  }
}

function mapRows(result) {
  const columns = result.columns || [];
  return (result.results || []).map((row) =>
    Object.fromEntries(columns.map((column, index) => [column, row[index]]))
  );
}

function escapeLiteral(value) {
  return String(value).replaceAll("'", "''");
}

function cleanLabel(value, fallback = 'Unknown') {
  const input = String(value || '').trim();
  if (!input) return fallback;
  if (input === '$direct') return 'Direct';
  if (input === 'hero') return 'Hero';
  if (input === 'capabilities') return 'Capabilities';
  if (input === 'destinations') return 'Destinations';
  if (input === 'ventures') return 'Ventures';
  if (input === 'proof') return 'Proof';
  if (input === 'manifesto') return 'Life After AI';
  if (input === 'contact') return 'Contact';
  return input;
}
