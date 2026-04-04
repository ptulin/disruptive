import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = '/Users/patu/Documents/CursorProjects/DE.Main';
const requiredFiles = [
  'index.html',
  'styles.css',
  'script.js',
  'boss.html',
  'boss.css',
  'boss.js',
  'vercel.json',
  'api/contact.js',
  'api/boss-auth.js',
  'api/boss-session.js',
  'api/boss-logout.js',
  'api/boss-stats.js',
  'api/_boss.js',
];

const jsFiles = [
  'script.js',
  'boss.js',
  'api/contact.js',
  'api/boss-auth.js',
  'api/boss-session.js',
  'api/boss-logout.js',
  'api/boss-stats.js',
  'api/_boss.js',
];

let failed = false;

for (const file of requiredFiles) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) {
    console.error(`Missing required file: ${file}`);
    failed = true;
  }
}

try {
  JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  console.log('vercel.json OK');
} catch (error) {
  console.error(`Invalid vercel.json: ${error.message}`);
  failed = true;
}

for (const file of jsFiles) {
  try {
    execFileSync('node', ['--check', path.join(root, file)], { stdio: 'ignore' });
    console.log(`${file} OK`);
  } catch (error) {
    console.error(`Syntax check failed: ${file}`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log('Project checks passed');
