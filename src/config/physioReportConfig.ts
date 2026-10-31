/**
 * src/config/physioReportConfig.ts
 * Centralized configuration and message styles for Daily WhatsApp Reports.
 */

export type MessageStyleType = 'standard' | 'rutuja' | 'hritika';
export type DateStyleType = 'long' | 'short';

export interface PhysioReportProfile {
  key: string;
  display: string;
  sheet: string;
  aliases: string[];
  style: MessageStyleType;
  dateStyle: DateStyleType;
}

export interface DayCounts {
  new: number;
  before: number;
  repeat: number;
  ns: number;
  under: number;
  after: number;
  total: number;
  pitched: number;
  done: number;
}

export interface DateParts {
  y: number;
  m: number; // 1-12
  d: number; // 1-31
}

export const PHYSIO_REPORT_CONFIGS: PhysioReportProfile[] = [
  { 
    key: 'gursheen',  
    display: 'Dr Gursheen',          
    sheet: 'Daily Tracker - Gursheen',  
    aliases: ['gursheen', 'dr gursheen', 'dr. gursheen'],
    style: 'standard', 
    dateStyle: 'long'  
  },
  { 
    key: 'dipti',     
    display: 'Dr. Dipti Mestry',     
    sheet: 'Daily Tracker - Dipti',     
    aliases: ['dipti', 'dr dipti', 'dr. dipti', 'dipti mestry', 'dr. dipti mestry'],
    style: 'standard', 
    dateStyle: 'long'  
  },
  { 
    key: 'aishwarya', 
    display: 'Dr Aishwarya',         
    sheet: 'Daily Tracker - Aishwarya', 
    aliases: ['aishwarya', 'dr aishwarya', 'dr. aishwarya', 'aishwarya panchal'],
    style: 'standard', 
    dateStyle: 'long'  
  },
  { 
    key: 'rutuja',    
    display: 'Dr Rutuja Tulaskar',   
    sheet: 'Daily Tracker - Rutuja',    
    aliases: ['rutuja', 'dr rutuja', 'dr. rutuja', 'rutuja tulaskar', 'dr rutuja tulaskar'],
    style: 'rutuja',   
    dateStyle: 'long'  
  },
  { 
    key: 'pooja',     
    display: 'Dr Pooja',             
    sheet: 'Daily Tracker - Pooja',     
    aliases: ['pooja', 'dr pooja', 'dr. pooja', 'pooja seema'],
    style: 'standard', 
    dateStyle: 'long'  
  },
  { 
    key: 'kritika',   
    display: 'Dr Kritika',           
    sheet: 'Daily Tracker - Kritika',   
    aliases: ['kritika', 'dr kritika', 'dr. kritika', 'kritika gawand'],
    style: 'standard', 
    dateStyle: 'long'  
  },
  { 
    key: 'hritika',   
    display: 'Dr Hritika (PT)',      
    sheet: 'Daily Tracker - Hritika',   
    aliases: ['hritika', 'dr hritika', 'dr. hritika', 'hritika chavan', 'dr hritika (pt)'],
    style: 'hritika',  
    dateStyle: 'short' 
  },
  { 
    key: 'gaurav',    
    display: 'Dr Gaurav',            
    sheet: 'Daily Tracker - Gaurav',    
    aliases: ['gaurav', 'dr gaurav', 'dr. gaurav'],
    style: 'standard', 
    dateStyle: 'long'  
  }
];

export const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MONTHS_SHORT = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
];

export function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function formatDateLabel(day: DateParts, dateStyle: DateStyleType): string {
  const months = dateStyle === 'short' ? MONTHS_SHORT : MONTHS_LONG;
  return `${getOrdinal(day.d)} ${months[day.m - 1]}`;
}

export interface MessageStyleFormatter {
  blankLineAfterDate: boolean;
  walkins: (c: DayCounts) => string;
  pitched: (n: number) => string;
  done: (n: number) => string;
}

export const REPORT_STYLES: Record<MessageStyleType, MessageStyleFormatter> = {
  /**
   * Dipti / default:
   * Total walk-ins - 4 + ( 1 before my check in, 2 repeat)
   * Physio sessions Pitched - 4
   * Physio sessions Done - 4
   */
  standard: {
    blankLineAfterDate: false,
    walkins: (c: DayCounts) => {
      const p: string[] = [];
      if (c.before) p.push(`${c.before} before my check in`);
      if (c.repeat) p.push(`${c.repeat} repeat`);
      if (c.ns) p.push(`${c.ns} N/S`);
      if (c.under) p.push(`${c.under} under 1/5 mins`);
      if (c.after) p.push(`${c.after} after checkout`);
      return p.length
        ? 'Total walk-ins - ' + c.new + ' + ( ' + p.join(', ') + ')'
        : 'Total walk-ins - ' + c.new;
    },
    pitched: (n: number) => `Physio sessions Pitched - ${n}`,
    done: (n: number) => `Physio sessions Done - ${n}`
  },

  /**
   * Rutuja:
   * Total walk-ins 2 +
   * (Before 2, Repeat 7, N/S 1, Under 1/5 mins 3, After checkout 2)
   * Physio Sessions Pitched- 6
   * Physio Sessions Done - 6
   */
  rutuja: {
    blankLineAfterDate: false,
    walkins: (c: DayCounts) => {
      const p: string[] = [];
      if (c.before) p.push(`Before ${c.before}`);
      if (c.repeat) p.push(`Repeat ${c.repeat}`);
      if (c.ns) p.push(`N/S ${c.ns}`);
      if (c.under) p.push(`Under 1/5 mins ${c.under}`);
      if (c.after) p.push(`After checkout ${c.after}`);
      return p.length
        ? `Total walk-ins ${c.new} +\n(${p.join(', ')})`
        : `Total walk-ins ${c.new}`;
    },
    pitched: (n: number) => `Physio Sessions Pitched- ${n}`,
    done: (n: number) => `Physio Sessions Done - ${n}`
  },

  /**
   * Hritika:
   * Total walk-in: 4 (+2 repeat +1 customer after check out)
   * Physio sessions pitched: 4
   * Physio sessions done: 4
   */
  hritika: {
    blankLineAfterDate: true,
    walkins: (c: DayCounts) => {
      const p: string[] = [];
      if (c.repeat) p.push(`+${c.repeat} repeat`);
      if (c.under) p.push(`+${c.under} less than a min`);
      if (c.ns) p.push(`+${c.ns} not shared`);
      if (c.after) p.push(`+${c.after} customer after check out`);
      if (c.before) p.push(`+${c.before} before my check in`);
      return p.length
        ? `Total walk-in: ${c.new} (${p.join(' ')})`
        : `Total walk-in: ${c.new}`;
    },
    pitched: (n: number) => `Physio sessions pitched: ${n}`,
    done: (n: number) => `Physio sessions done: ${n}`
  }
};

export function findPhysioConfig(identifier: string): PhysioReportProfile | null {
  if (!identifier) return null;
  const clean = identifier.toLowerCase().trim();

  // 1. Direct key match
  const byKey = PHYSIO_REPORT_CONFIGS.find(p => p.key === clean);
  if (byKey) return byKey;

  // 2. Direct tab match
  const bySheet = PHYSIO_REPORT_CONFIGS.find(p => p.sheet.toLowerCase() === clean);
  if (bySheet) return bySheet;

  // 3. Alias or substring match
  const byAlias = PHYSIO_REPORT_CONFIGS.find(p => 
    p.aliases.some(a => clean.includes(a) || a.includes(clean))
  );
  if (byAlias) return byAlias;

  return null;
}
