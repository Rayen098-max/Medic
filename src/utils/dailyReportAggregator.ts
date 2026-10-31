/**
 * src/utils/dailyReportAggregator.ts
 * Pure mathematical aggregation and message generation for Daily WhatsApp Reports.
 * Ported directly from verified reference logic in Code.gs.
 */

import {
  type DayCounts,
  type DateParts,
  type PhysioReportProfile,
  REPORT_STYLES,
  formatDateLabel
} from '../config/physioReportConfig';

export interface RawSheetRow {
  [key: string]: any;
}

export interface ParsedClientRecord {
  date?: DateParts | null;
  name: string;
  concern: string;
  category: string;
  reason: string;
  pitched: boolean;
  done: boolean;
}

export interface AggregationResult {
  ok: boolean;
  physio: {
    key: string;
    display: string;
  };
  dateISO: string;
  dateLabel: string;
  counts: DayCounts;
  message: string;
  matchedMode: 'exact' | 'swapped' | 'none';
  warnings: string[];
  error?: string;
}

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

function anyRx(text: string, list: RegExp[]): boolean {
  for (let i = 0; i < list.length; i++) {
    if (list[i].test(text)) return true;
  }
  return false;
}

export function classifyRecord(rec: { name: string; concern: string; reason: string }): 'before' | 'repeat' | 'under' | 'after' | 'ns' | 'new' {
  const txt = `${rec.reason || ''} || ${rec.concern || ''}`.toLowerCase();

  if (anyRx(txt, RX.before)) return 'before';
  if (anyRx(txt, RX.repeat)) return 'repeat';
  if (anyRx(txt, RX.under))  return 'under';
  if (anyRx(txt, RX.after))  return 'after';

  const nm = (rec.name || '').toLowerCase().trim();
  if (!nm || anyRx(nm, RX.nsName)) return 'ns';

  return 'new';
}

function norm(v: any): string {
  if (v === null || v === undefined) return '';
  return String(v).toLowerCase().replace(/\s+/g, ' ').trim();
}

function str(v: any): string {
  if (v === null || v === undefined) return '';
  return String(v).replace(/\s+/g, ' ').trim();
}

function isYes(v: any): boolean {
  const n = norm(v);
  return n === 'yes' || n === 'y' || n === 'true';
}

export function parseISODate(s: string): DateParts | null {
  const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = +m[1];
  const mo = +m[2];
  const d = +m[3];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, m: mo, d };
}

export function parseCellDate(v: any): DateParts | null {
  if (v === null || v === undefined || v === '') return null;

  if (Object.prototype.toString.call(v) === '[object Date]') {
    const d = v as Date;
    if (isNaN(d.getTime())) return null;
    return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
  }

  // Excel serial number epoch
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    const dt = new Date(Math.round((v - 25569) * 86400000));
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
  }

  const s = String(v).trim().replace(/\\/g, '/');

  // Ignored junk cells
  if (/^(cc|no cc|\.\.\.|start|end|physio|dates?)$/i.test(s)) {
    return null;
  }

  let m = s.match(/^(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})/);
  if (m) {
    return safeDay(+m[1], +m[2], +m[3]);
  }

  m = s.match(/^(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?$/);
  if (!m) return null;

  let d = +m[1];
  let mo = +m[2];
  let y = m[3] ? (+m[3] < 100 ? 2000 + (+m[3]) : +m[3]) : 0;

  // "10/27" typed the American way (month > 12 guard)
  if (mo > 12 && d <= 12) {
    const t = d;
    d = mo;
    mo = t;
  }

  if (!y) {
    const now = new Date();
    y = now.getFullYear();
    const probe = new Date(y, mo - 1, d);
    if (probe.getTime() - now.getTime() > 60 * 86400000) y -= 1;
  }

  return safeDay(y, mo, d);
}

function safeDay(y: number, mo: number, d: number): DateParts | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, m: mo, d };
}

export function sameDay(a?: DateParts | null, b?: DateParts | null): boolean {
  return !!a && !!b && a.y === b.y && a.m === b.m && a.d === b.d;
}

export function swapDay(d?: DateParts | null): DateParts | null {
  return d ? { y: d.y, m: d.d, d: d.m } : null;
}

function findColIndex(headers: string[], aliases: string[]): number {
  for (let a = 0; a < aliases.length; a++) {
    const alias = aliases[a].toLowerCase();
    for (let i = 0; i < headers.length; i++) {
      const h = norm(headers[i]);
      if (h.startsWith(alias) || h === alias) return i;
    }
  }
  return -1;
}

export function extractClientRecords(rows: any[][], rawHeaders?: string[]): ParsedClientRecord[] {
  if (!rows || rows.length < 2) return [];

  const headers = (rawHeaders || rows[0]).map(norm);

  const colDate = findColIndex(headers, ['date', 'dates']);
  const colName = findColIndex(headers, ['customer name', 'name']);
  const colConcern = findColIndex(headers, ['customer concern', 'concern']);
  const colCategory = findColIndex(headers, ['primary category', 'category']);
  const colPitched = findColIndex(headers, ['physio pitched', 'pitched']);
  const colDone = findColIndex(headers, ['physio session done', 'physio session', 'session done']);
  const colReason = findColIndex(headers, ['reason']);

  const out: ParsedClientRecord[] = [];
  let currentDate: DateParts | null = null;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row.length) continue;

    const cellVal = colDate >= 0 ? row[colDate] : null;
    const parsed = parseCellDate(cellVal);
    if (parsed) {
      currentDate = parsed;
    }

    const name = colName >= 0 ? str(row[colName]) : '';
    const concern = colConcern >= 0 ? str(row[colConcern]) : '';
    const category = colCategory >= 0 ? str(row[colCategory]) : '';
    const reason = colReason >= 0 ? str(row[colReason]) : '';
    const pitched = colPitched >= 0 ? isYes(row[colPitched]) : false;
    const done = colDone >= 0 ? isYes(row[colDone]) : false;

    // Drop blank rows and drag-fill phantoms (e.g. only Pitched=Yes)
    if (!name && !concern && !category && !reason) continue;
    if (!currentDate) continue;

    out.push({
      date: currentDate,
      name,
      concern,
      category,
      reason,
      pitched,
      done
    });
  }

  return out;
}

export function filterRowsForDay(
  records: ParsedClientRecord[],
  targetDay: DateParts
): { rows: ParsedClientRecord[]; mode: 'exact' | 'swapped' | 'none' } {
  const exact: ParsedClientRecord[] = [];
  const swapped: ParsedClientRecord[] = [];

  for (let i = 0; i < records.length; i++) {
    const rd = records[i].date;
    if (sameDay(rd, targetDay)) {
      exact.push(records[i]);
    } else if (sameDay(swapDay(rd), targetDay)) {
      swapped.push(records[i]);
    }
  }

  if (exact.length > 0) return { rows: exact, mode: 'exact' };
  if (swapped.length > 0) return { rows: swapped, mode: 'swapped' };
  return { rows: [], mode: 'none' };
}

export function countDayBuckets(rows: ParsedClientRecord[], excludeNsFromSessions = true): DayCounts {
  const c: DayCounts = {
    new: 0,
    before: 0,
    repeat: 0,
    ns: 0,
    under: 0,
    after: 0,
    total: 0,
    pitched: 0,
    done: 0
  };

  rows.forEach(r => {
    const bucket = classifyRecord(r);
    c.total++;
    if (bucket === 'new') {
      c.new++;
    } else {
      c[bucket]++;
    }

    const skipSession = excludeNsFromSessions && bucket === 'ns';
    if (!skipSession) {
      if (r.pitched) c.pitched++;
      if (r.done) c.done++;
    }
  });

  return c;
}

export function buildWhatsAppReportMessage(
  physio: PhysioReportProfile,
  day: DateParts,
  counts: DayCounts
): string {
  const style = REPORT_STYLES[physio.style] || REPORT_STYLES.standard;
  const lines: string[] = [
    physio.display,
    `Report for ${formatDateLabel(day, physio.dateStyle)}`
  ];

  if (style.blankLineAfterDate) {
    lines.push('');
  }

  lines.push(style.walkins(counts));
  lines.push(style.pitched(counts.pitched));
  lines.push(style.done(counts.done));

  return lines.join('\n');
}

export function generatePhysioDailyReport(
  physio: PhysioReportProfile,
  targetDateISO: string,
  rawRows: any[][],
  excludeNsFromSessions = true
): AggregationResult {
  const day = parseISODate(targetDateISO);
  if (!day) {
    return {
      ok: false,
      physio: { key: physio.key, display: physio.display },
      dateISO: targetDateISO,
      dateLabel: targetDateISO,
      counts: { new: 0, before: 0, repeat: 0, ns: 0, under: 0, after: 0, total: 0, pitched: 0, done: 0 },
      message: '',
      matchedMode: 'none',
      warnings: [],
      error: `Invalid ISO date: "${targetDateISO}"`
    };
  }

  const allRecords = extractClientRecords(rawRows);
  const matched = filterRowsForDay(allRecords, day);
  const counts = countDayBuckets(matched.rows, excludeNsFromSessions);
  const message = buildWhatsAppReportMessage(physio, day, counts);

  const warnings: string[] = [];
  if (matched.rows.length === 0) {
    warnings.push('No entries in the sheet for this date yet.');
  }
  if (matched.mode === 'swapped') {
    warnings.push('Date matched using the legacy day/month swap (Excel import).');
  }

  return {
    ok: true,
    physio: { key: physio.key, display: physio.display },
    dateISO: targetDateISO,
    dateLabel: formatDateLabel(day, physio.dateStyle),
    counts,
    message,
    matchedMode: matched.mode,
    warnings
  };
}

