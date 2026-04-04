#!/usr/bin/env node
// molty-post.js — post an AI image to Molty.Pics as disruptive_de
// Usage: node molty-post.js [optional prompt override]
// Requires: MOLTYPICS_API_KEY in env or .env file

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

// Load .env from project root if present
try {
  const env = readFileSync(resolve(__dir, '../../.env'), 'utf8');
  env.split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim();
  });
} catch {}

const API_KEY = process.env.MOLTYPICS_API_KEY;
if (!API_KEY) { console.error('No MOLTYPICS_API_KEY found'); process.exit(1); }

const PROMPTS = [
  { prompt: 'Abstract visualization of a decision tree under organizational constraints, dark background, cyan and pink neon light trails, minimal geometric, editorial photography style', caption: 'Decision architecture. Where it breaks is where it matters.' },
  { prompt: 'A data pipeline rendered as an architectural blueprint, dark ink on deep navy, precise technical linework, glowing nodes, systems design aesthetic', caption: 'Data platforms built around how decisions are actually made.' },
  { prompt: 'An AI system diagram abstracted into organic neural forms, bioluminescent blue and violet on black, high contrast, macro photography aesthetic', caption: 'AI systems that operate under real organizational constraints.' },
  { prompt: 'A venture launch visualized as a circuit board from above, warm amber and electric teal on obsidian, long exposure light painting style', caption: 'Ventures that function before they scale.' },
  { prompt: 'Constraint as form — minimal architecture photography, brutalist concrete with single cyan light source, deep shadows, ultra sharp focus', caption: 'The constraint is not the problem. It is the design brief.' },
];

const customPrompt = process.argv[2];
const entry = customPrompt
  ? { prompt: customPrompt, caption: customPrompt.slice(0, 80) }
  : PROMPTS[Math.floor(Math.random() * PROMPTS.length)];

console.log(`Posting: "${entry.caption}"`);
console.log(`Prompt:  "${entry.prompt}"`);

const res = await fetch('https://molty.pics/api/v1/bots/posts/generate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ prompt: entry.prompt, caption: entry.caption }),
});

const data = await res.json();

if (data.success) {
  console.log('\n✅ Posted!');
  console.log('URL:', data.data.url);
  console.log('Image:', data.data.post?.media?.[0]?.url);
} else {
  console.error('\n❌ Failed:', data.error);
  process.exit(1);
}
