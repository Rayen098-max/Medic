/**
 * tests/daily_report_math.test.cjs
 * Validates the Daily Report Aggregator mathematics and formatting against the reference cases.
 */

const assert = require('assert');

// 1. Emulate classifyRecord and countDayBuckets
const RX = {
  before: [
    /before\s*(my\s*)?check\s*-?\s*in/i,
    /came\s*(b\/w|between)\s*11/i,
    /between\s*11/i,
    /11\s*[-to]+\s*1\s*p\.?m/i,
    /before\s*1\s*p\.?m/i
  ],
  repeat: [
    /\brepeat/i,
    /session\s*(already\s*)?done\s*again/i
  ],
  under: [
    /under\s*\d+\s*(min|mins|minute|minutes)/i,
    /(less than|under)\s*(a|1|one)\s*min/i,
    /<\s*\d+\s*min/i
  ],
  after: [
    /after\s*(my\s*)?check\s*-?\s*out/i,
    /after\s*checkout/i,
    /after\s*clocked\s*out/i,
    /came\s*after.*check/i,
    /after\s*9\s*p\.?m/i
  ],
  nsName: [
    /^na$/i,
    /^n\/a$/i,
    /^ns$/i,
    /not\s*shared/i,
    /^\d+\s*(man|men|male|fam|family|woman|women|lady|ladies)$/i,
    /^couple$/i,
    /^group$/i,
    /^family$/i
  ]
};

function anyRx(text, list) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].test(text)) return true;
  }
  return false;
}

function classifyRecord(rec) {
  const txt = `${rec.reason || ''} || ${rec.concern || ''}`.toLowerCase();

  if (anyRx(txt, RX.before)) return 'before';
  if (anyRx(txt, RX.repeat)) return 'repeat';
  if (anyRx(txt, RX.under))  return 'under';
  if (anyRx(txt, RX.after))  return 'after';

  const nm = (rec.name || '').toLowerCase().trim();
  if (!nm || anyRx(nm, RX.nsName)) return 'ns';

  return 'new';
}

function countDayBuckets(rows, excludeNsFromSessions = true) {
  const c = { new: 0, before: 0, repeat: 0, ns: 0, under: 0, after: 0, total: 0, pitched: 0, done: 0 };
  rows.forEach(r => {
    const bucket = classifyRecord(r);
    c.total++;
    if (bucket === 'new') c.new++;
    else c[bucket]++;

    const skip = excludeNsFromSessions && bucket === 'ns';
    if (!skip) {
      if (r.pitched) c.pitched++;
      if (r.done) c.done++;
    }
  });
  return c;
}

const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

function getOrdinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatDateLabel(day, dateStyle) {
  const months = dateStyle === 'short' ? MONTHS_SHORT : MONTHS_LONG;
  return `${getOrdinal(day.d)} ${months[day.m - 1]}`;
}

const REPORT_STYLES = {
  standard: {
    blankLineAfterDate: false,
    walkins: (c) => {
      const p = [];
      if (c.before) p.push(`${c.before} before my check in`);
      if (c.repeat) p.push(`${c.repeat} repeat`);
      if (c.ns) p.push(`${c.ns} N/S`);
      if (c.under) p.push(`${c.under} under 1/5 mins`);
      if (c.after) p.push(`${c.after} after checkout`);
      return p.length ? 'Total walk-ins - ' + c.new + ' + ( ' + p.join(', ') + ')' : 'Total walk-ins - ' + c.new;
    },
    pitched: (n) => `Physio sessions Pitched - ${n}`,
    done: (n) => `Physio sessions Done - ${n}`
  },
  rutuja: {
    blankLineAfterDate: false,
    walkins: (c) => {
      const p = [];
      if (c.before) p.push(`Before ${c.before}`);
      if (c.repeat) p.push(`Repeat ${c.repeat}`);
      if (c.ns) p.push(`N/S ${c.ns}`);
      if (c.under) p.push(`Under 1/5 mins ${c.under}`);
      if (c.after) p.push(`After checkout ${c.after}`);
      return p.length ? `Total walk-ins ${c.new} +\n(${p.join(', ')})` : `Total walk-ins ${c.new}`;
    },
    pitched: (n) => `Physio Sessions Pitched- ${n}`,
    done: (n) => `Physio Sessions Done - ${n}`
  },
  hritika: {
    blankLineAfterDate: true,
    walkins: (c) => {
      const p = [];
      if (c.repeat) p.push(`+${c.repeat} repeat`);
      if (c.under) p.push(`+${c.under} less than a min`);
      if (c.ns) p.push(`+${c.ns} not shared`);
      if (c.after) p.push(`+${c.after} customer after check out`);
      if (c.before) p.push(`+${c.before} before my check in`);
      return p.length ? `Total walk-in: ${c.new} (${p.join(' ')})` : `Total walk-in: ${c.new}`;
    },
    pitched: (n) => `Physio sessions pitched: ${n}`,
    done: (n) => `Physio sessions done: ${n}`
  }
};

function buildMessage(display, dateStyle, styleKey, day, counts) {
  const style = REPORT_STYLES[styleKey];
  const lines = [
    display,
    `Report for ${formatDateLabel(day, dateStyle)}`
  ];
  if (style.blankLineAfterDate) lines.push('');
  lines.push(style.walkins(counts));
  lines.push(style.pitched(counts.pitched));
  lines.push(style.done(counts.done));
  return lines.join('\n');
}

console.log('--- TEST 1: Dipti 29 Oct (Style A) ---');
const diptiCounts = { new: 4, before: 1, repeat: 2, ns: 0, under: 0, after: 0, total: 7, pitched: 4, done: 4 };
const diptiMsg = buildMessage('Dr. Dipti Mestry', 'long', 'standard', { y: 2026, m: 10, d: 29 }, diptiCounts);
const expectedDipti = [
  'Dr. Dipti Mestry',
  'Report for 29th October',
  'Total walk-ins - 4 + ( 1 before my check in, 2 repeat)',
  'Physio sessions Pitched - 4',
  'Physio sessions Done - 4'
].join('\n');
console.log(diptiMsg);
assert.strictEqual(diptiMsg, expectedDipti, 'Dipti 29 Oct must match reference exactly');
console.log('✔ PASS Dipti 29 Oct\n');

console.log('--- TEST 2: Rutuja 27 Oct (Style B) ---');
const rutujaCounts = { new: 2, before: 2, repeat: 7, ns: 1, under: 3, after: 2, total: 17, pitched: 6, done: 6 };
const rutujaMsg = buildMessage('Dr Rutuja Tulaskar', 'long', 'rutuja', { y: 2026, m: 10, d: 27 }, rutujaCounts);
const expectedRutuja = [
  'Dr Rutuja Tulaskar',
  'Report for 27th October',
  'Total walk-ins 2 +\n(Before 2, Repeat 7, N/S 1, Under 1/5 mins 3, After checkout 2)',
  'Physio Sessions Pitched- 6',
  'Physio Sessions Done - 6'
].join('\n');
console.log(rutujaMsg);
assert.strictEqual(rutujaMsg, expectedRutuja, 'Rutuja 27 Oct must match reference exactly');
console.log('✔ PASS Rutuja 27 Oct\n');

console.log('--- TEST 3: Hritika 27 Oct (Style C) ---');
const hritikaCounts = { new: 4, before: 0, repeat: 2, ns: 0, under: 0, after: 1, total: 7, pitched: 4, done: 4 };
const hritikaMsg = buildMessage('Dr Hritika (PT)', 'short', 'hritika', { y: 2026, m: 10, d: 27 }, hritikaCounts);
const expectedHritika = [
  'Dr Hritika (PT)',
  'Report for 27th oct',
  '',
  'Total walk-in: 4 (+2 repeat +1 customer after check out)',
  'Physio sessions pitched: 4',
  'Physio sessions done: 4'
].join('\n');
console.log(hritikaMsg);
assert.strictEqual(hritikaMsg, expectedHritika, 'Hritika 27 Oct must match reference exactly');
console.log('✔ PASS Hritika 27 Oct\n');

console.log('--- TEST 4: N/S Pitched Exclusion Rule ---');
const rowsWithNS = [
  { name: '1 MAN', concern: 'Neck pain', reason: '', pitched: true, done: true },
  { name: 'Ramesh', concern: 'Back pain', reason: '', pitched: true, done: true }
];
const countsNS = countDayBuckets(rowsWithNS, true);
assert.strictEqual(countsNS.total, 2);
assert.strictEqual(countsNS.ns, 1);
assert.strictEqual(countsNS.new, 1);
assert.strictEqual(countsNS.pitched, 1, 'N/S row must NOT increment pitched when excludeNsFromSessions is true');
assert.strictEqual(countsNS.done, 1, 'N/S row must NOT increment done when excludeNsFromSessions is true');
console.log('✔ PASS N/S session exclusion\n');

console.log('ALL REFERENCE VERIFICATION TESTS PASSED!');
