const state = {
    range: '30d',
    focus: 'all',
    day: '',
    chart: null,
};

document.addEventListener('DOMContentLoaded', () => {
    initBossDashboard();
});

async function initBossDashboard() {
    const loginForm = document.getElementById('bossLoginForm');
    const loginSection = document.getElementById('bossLogin');
    const appSection = document.getElementById('bossApp');
    const loginError = document.getElementById('bossLoginError');

    bindRangeSwitch();
    bindFocusSwitch();
    bindLogout(loginSection, appSection);

    loginForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        loginError.textContent = '';

        const formData = new FormData(loginForm);
        const password = String(formData.get('password') || '');

        const response = await fetch('/api/boss-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) {
            loginError.textContent = result.error || 'Unable to unlock dashboard.';
            return;
        }

        loginSection.classList.add('is-hidden');
        appSection.classList.remove('is-hidden');
        await loadDashboard();
    });

    const existingSession = await hasBossSession();
    if (!existingSession) return;

    loginSection.classList.add('is-hidden');
    appSection.classList.remove('is-hidden');
    await loadDashboard();
}

function bindLogout(loginSection, appSection) {
    document.getElementById('bossLogout')?.addEventListener('click', async () => {
        await fetch('/api/boss-logout', { method: 'POST' });
        state.day = '';
        state.focus = 'all';
        state.range = '30d';
        syncActiveButtons('#focusSwitch', state.focus, 'focus');
        syncActiveButtons('#rangeSwitch', state.range, 'range');
        document.getElementById('bossLoginForm')?.reset();
        document.getElementById('bossLoginError').textContent = '';
        loginSection.classList.remove('is-hidden');
        appSection.classList.add('is-hidden');
        document.getElementById('bossPassword')?.focus();
    });
}

function bindRangeSwitch() {
    document.getElementById('rangeSwitch')?.addEventListener('click', async (event) => {
        const button = event.target.closest('button[data-range]');
        if (!button || button.dataset.range === state.range) return;
        state.range = button.dataset.range;
        state.day = '';
        syncActiveButtons('#rangeSwitch', state.range, 'range');
        await loadDashboard();
    });
}

function bindFocusSwitch() {
    document.getElementById('focusSwitch')?.addEventListener('click', async (event) => {
        const button = event.target.closest('button[data-focus]');
        if (!button || button.dataset.focus === state.focus) return;
        state.focus = button.dataset.focus;
        syncActiveButtons('#focusSwitch', state.focus, 'focus');
        await loadDashboard();
    });
}

function syncActiveButtons(selector, value, attribute) {
    document.querySelectorAll(`${selector} button`).forEach((button) => {
        button.classList.toggle('is-active', button.dataset[attribute] === value);
    });
}

async function loadDashboard() {
    const data = await fetchDashboardData();
    if (data) renderDashboard(data);
}

async function fetchDashboardData() {
    const url = new URL('/api/boss-stats', window.location.origin);
    url.searchParams.set('range', state.range);
    url.searchParams.set('focus', state.focus);
    if (state.day) url.searchParams.set('day', state.day);

    const response = await fetch(url.toString());
    if (response.status === 401) return null;

    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
        console.error(result.error || 'Unable to load boss dashboard');
        return null;
    }

    return result.data;
}

async function hasBossSession() {
    const response = await fetch('/api/boss-session');
    const result = await response.json().catch(() => ({}));
    return Boolean(result.authenticated);
}

function renderDashboard(data) {
    renderSummary(data.summary);
    renderTimeline(data.timeline);
    renderList('bossReferrers', data.referrers);
    renderList('bossCountries', data.countries, 'var(--boss-blue)');
    renderList('bossTargets', data.targets, 'var(--boss-green)');
    renderList('bossInterests', data.interests, 'var(--boss-rose)');
    renderList('bossSections', data.sections, 'var(--boss-gold)');
    renderDetails(data.details, data.day, data.focus);
}

function renderSummary(summary) {
    const conversion = summary.formStarts ? Math.round((summary.formSubmits / summary.formStarts) * 100) : 0;
    const cards = [
        { label: 'Homepage views', value: formatNumber(summary.views), focus: 'traffic' },
        { label: 'Estimated visitors', value: formatNumber(summary.visitors), focus: 'traffic' },
        { label: 'Avg. engaged time', value: `${formatNumber(summary.avgSeconds)}s`, focus: 'traffic' },
        { label: 'Destination clicks', value: formatNumber(summary.destinationClicks), focus: 'destination' },
        { label: 'Contact conversion', value: `${conversion}%`, focus: 'contact' },
    ];

    document.getElementById('bossSummary').innerHTML = cards.map((card) => `
        <article>
            <button type="button" data-focus-jump="${card.focus}">
                <span class="boss-summary__value">${card.value}</span>
                <span class="boss-summary__label">${card.label}</span>
            </button>
        </article>
    `).join('');

    document.querySelectorAll('[data-focus-jump]').forEach((button) => {
        button.addEventListener('click', async () => {
            state.focus = button.dataset.focusJump;
            syncActiveButtons('#focusSwitch', state.focus, 'focus');
            await loadDashboard();
            document.querySelector('.boss-panel--details')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
}

function renderTimeline(timeline) {
    const context = document.getElementById('bossTimelineChart');
    if (!context) return;

    const labels = timeline.map((point) => formatDay(point.day));
    const datasets = [
        { label: 'Views', data: timeline.map((point) => point.views), borderColor: '#df6d2a', backgroundColor: 'rgba(223,109,42,0.12)' },
        { label: 'CTA clicks', data: timeline.map((point) => point.ctaClicks), borderColor: '#2f6de0', backgroundColor: 'rgba(47,109,224,0.12)' },
        { label: 'Destination clicks', data: timeline.map((point) => point.destinationClicks), borderColor: '#1d8a66', backgroundColor: 'rgba(29,138,102,0.12)' },
        { label: 'Venture clicks', data: timeline.map((point) => point.ventureClicks), borderColor: '#b6831d', backgroundColor: 'rgba(182,131,29,0.12)' },
        { label: 'Form submits', data: timeline.map((point) => point.formSubmits), borderColor: '#b24b60', backgroundColor: 'rgba(178,75,96,0.12)' },
    ];

    if (state.chart) state.chart.destroy();

    state.chart = new Chart(context, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'nearest' },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { usePointStyle: true, boxWidth: 10, color: '#21160f' },
                },
                tooltip: {
                    callbacks: {
                        footer(items) {
                            return items.length ? 'Click to open this day in the details table.' : '';
                        },
                    },
                },
            },
            scales: {
                x: { ticks: { color: '#74604d' }, grid: { display: false } },
                y: { ticks: { precision: 0, color: '#74604d' }, grid: { color: 'rgba(33, 22, 15, 0.08)' } },
            },
            onClick: async (_event, elements) => {
                if (!elements.length) return;
                const index = elements[0].index;
                state.day = timeline[index]?.day || '';
                await loadDashboard();
                document.querySelector('.boss-panel--details')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            },
        },
    });
}

function renderList(id, items, color = 'var(--boss-accent)') {
    const container = document.getElementById(id);
    if (!container) return;

    if (!items.length) {
        container.innerHTML = '<p class="boss-table__meta">No data yet.</p>';
        return;
    }

    const max = Math.max(...items.map((item) => item.value), 1);
    container.innerHTML = items.map((item) => `
        <div class="boss-list__item">
            <div>
                <div class="boss-list__meta">
                    <span>${escapeHtml(item.label)}</span>
                    <strong>${formatNumber(item.value)}</strong>
                </div>
                <div class="boss-list__bar"><span style="width:${(item.value / max) * 100}%; background:${color};"></span></div>
            </div>
        </div>
    `).join('');
}

function renderDetails(details, day, focus) {
    const title = document.getElementById('bossDetailsTitle');
    const hint = document.getElementById('bossDetailsHint');
    const body = document.getElementById('bossDetails');
    if (!body) return;

    const focusLabel = {
        all: 'all key activity',
        traffic: 'traffic activity',
        cta: 'CTA activity',
        destination: 'destination clicks',
        venture: 'venture clicks',
        contact: 'contact activity',
        outbound: 'outbound clicks',
    }[focus] || 'activity';

    title.textContent = day ? `Recent activity for ${formatDay(day)}` : 'Recent activity';
    hint.textContent = day
        ? `Showing ${focusLabel} for the selected day. Click another point to switch days.`
        : `Showing ${focusLabel} for the selected time window.`;

    if (!details.length) {
        body.innerHTML = '<tr><td colspan="6" class="boss-table__meta">No matching events yet.</td></tr>';
        return;
    }

    body.innerHTML = details.map((item) => `
        <tr>
            <td>
                <div class="boss-table__event">${formatTime(item.timestamp)}</div>
                <div class="boss-table__meta">${formatDay(item.timestamp.slice(0, 10))}</div>
            </td>
            <td>${escapeHtml(item.eventLabel)}</td>
            <td>
                <div>${escapeHtml(item.target || '—')}</div>
                ${item.href ? `<div class="boss-table__meta">${escapeHtml(shorten(item.href, 38))}</div>` : ''}
            </td>
            <td>${escapeHtml(item.sectionName || '—')}</td>
            <td>${escapeHtml(item.interest || '—')}</td>
            <td>${escapeHtml(item.referrer || '—')}</td>
        </tr>
    `).join('');
}

function formatNumber(value) {
    return new Intl.NumberFormat('en-US').format(Number(value || 0));
}

function formatDay(value) {
    return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(value) {
    return new Date(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function shorten(value, max) {
    return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}
