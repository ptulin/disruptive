// lab.js — Pretext.js + Molty.Pics Lab section
import { prepare, layoutWithLines, layoutNextLine } from 'https://esm.sh/@chenglou/pretext@0.0.4';

// ── Config ─────────────────────────────────────────────────────────────────
const MOLTY_PUBLIC_API = 'https://molty.pics/api';
const PHRASES = [
  'AI systems that operate under real organizational constraints.',
  'Decision architecture built for the actual environment.',
  'Data platforms designed around how decisions are actually made.',
  'Ventures that function before they scale.',
  'The constraint is not the problem. The constraint is the design brief.',
];

// ── Pretext: variable-width text wrap ──────────────────────────────────────
function initPretextDemo() {
  const container = document.getElementById('lab-pretext-container');
  const canvas = document.getElementById('lab-pretext-canvas');
  const obstacle = document.getElementById('lab-obstacle');
  if (!container || !canvas || !obstacle) return;

  const ctx = canvas.getContext('2d');
  const font = '18px "Manrope", system-ui, sans-serif';
  const lineHeight = 28;

  let phraseIndex = 0;
  let charIndex = 0;
  let currentText = '';
  let animFrame;
  let prepared;
  let obstacleX = 60;
  let obstacleY = 30;
  let dragging = false;

  function resize() {
    canvas.width = container.offsetWidth;
    canvas.height = 160;
  }

  function prepareText() {
    prepared = prepare(PHRASES[phraseIndex], font);
  }

  function render() {
    if (!prepared) return;
    resize();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const W = canvas.width;
    const obsW = 90, obsH = 60;
    const obsLeft = obstacleX, obsRight = obstacleX + obsW;
    const obsTop = obstacleY, obsBottom = obstacleY + obsH;

    // Draw obstacle
    ctx.fillStyle = 'rgba(201, 120, 255, 0.18)';
    ctx.strokeStyle = 'rgba(201, 120, 255, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(obsLeft, obsTop, obsW, obsH, 8);
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = 'rgba(201, 120, 255, 0.7)';
    ctx.font = '11px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('drag me', obsLeft + obsW / 2, obsTop + obsH / 2 + 4);
    ctx.textAlign = 'left';

    // Layout with variable widths around obstacle
    ctx.fillStyle = 'rgba(246, 238, 251, 0.92)';
    ctx.font = font;

    let cursor = null;
    let y = lineHeight;
    let lineNum = 0;

    while (y <= canvas.height + lineHeight) {
      // Determine available width for this line
      const lineTop = y - lineHeight, lineBot = y;
      const overlapsObs =
        lineTop < obsBottom && lineBot > obsTop;

      let lineW = W - 32;
      let lineX = 16;

      if (overlapsObs) {
        if (obsLeft < W / 2) {
          // obstacle on left — text on right
          lineX = obsRight + 12;
          lineW = W - lineX - 16;
        } else {
          // obstacle on right — text on left
          lineW = obsLeft - 28;
        }
      }

      if (lineW < 40) { y += lineHeight; lineNum++; continue; }

      const result = layoutNextLine(prepared, cursor, lineW);
      if (!result) break;

      ctx.fillText(result.text, lineX, y);
      cursor = result.next;
      y += lineHeight;
      lineNum++;
      if (lineNum > 12) break;
    }
  }

  function typewriterTick() {
    if (charIndex <= PHRASES[phraseIndex].length) {
      currentText = PHRASES[phraseIndex].slice(0, charIndex);
      prepared = prepare(currentText || ' ', font);
      charIndex++;
      render();
      animFrame = setTimeout(typewriterTick, charIndex < 3 ? 80 : 28);
    } else {
      setTimeout(() => {
        phraseIndex = (phraseIndex + 1) % PHRASES.length;
        charIndex = 0;
        typewriterTick();
      }, 2800);
    }
  }

  // Drag obstacle
  function getPos(e) {
    const r = canvas.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    return { cx, cy };
  }

  canvas.addEventListener('mousedown', e => {
    const { cx, cy } = getPos(e);
    if (cx >= obstacleX && cx <= obstacleX + 90 && cy >= obstacleY && cy <= obstacleY + 60) {
      dragging = { dx: cx - obstacleX, dy: cy - obstacleY };
    }
  });
  canvas.addEventListener('mousemove', e => {
    if (!dragging) return;
    const { cx, cy } = getPos(e);
    obstacleX = Math.max(0, Math.min(canvas.width - 90, cx - dragging.dx));
    obstacleY = Math.max(0, Math.min(canvas.height - 60, cy - dragging.dy));
    render();
  });
  canvas.addEventListener('mouseup', () => { dragging = false; });
  canvas.addEventListener('touchstart', e => {
    const { cx, cy } = getPos(e);
    if (cx >= obstacleX && cx <= obstacleX + 90 && cy >= obstacleY && cy <= obstacleY + 60) {
      dragging = { dx: cx - obstacleX, dy: cy - obstacleY };
    }
  }, { passive: true });
  canvas.addEventListener('touchmove', e => {
    if (!dragging) return;
    const { cx, cy } = getPos(e);
    obstacleX = Math.max(0, Math.min(canvas.width - 90, cx - dragging.dx));
    obstacleY = Math.max(0, Math.min(canvas.height - 60, cy - dragging.dy));
    render();
  }, { passive: true });
  canvas.addEventListener('touchend', () => { dragging = false; });

  window.addEventListener('resize', () => { resize(); render(); });

  prepareText();
  typewriterTick();
}

// ── Molty.Pics: fetch latest posts ─────────────────────────────────────────
async function loadMoltyFeed() {
  const grid = document.getElementById('lab-molty-grid');
  const status = document.getElementById('lab-molty-status');
  if (!grid) return;

  try {
    const res = await fetch(`${MOLTY_PUBLIC_API}/posts?limit=6&mode=recent`);
    if (!res.ok) throw new Error('Feed unavailable');
    const data = await res.json();
    const posts = data?.data?.posts ?? data?.data?.items ?? [];

    if (!posts.length) {
      status.textContent = 'No posts yet — bot not active.';
      return;
    }

    status.style.display = 'none';
    posts.slice(0, 6).forEach(post => {
      const img = post.media?.[0]?.url;
      const caption = post.caption || '';
      const url = post.url || `https://molty.pics/p/${post.slug}`;
      const card = document.createElement('a');
      card.href = url;
      card.target = '_blank';
      card.rel = 'noopener';
      card.className = 'lab-molty-card';
      card.innerHTML = img
        ? `<img src="${img}" alt="${caption}" loading="lazy"><span class="lab-molty-caption">${caption}</span>`
        : `<span class="lab-molty-caption lab-molty-caption--no-img">${caption}</span>`;
      grid.appendChild(card);
    });
  } catch (err) {
    status.textContent = 'Feed offline. Check back soon.';
  }
}

// ── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initPretextDemo();
  loadMoltyFeed();
});
