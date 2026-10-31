import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';
import { ProfileDropdown } from '@/components/profile-dropdown';
import { Search } from '@/components/search';
import { ThemeSwitch } from '@/components/theme-switch';
import Papa from 'papaparse';
import {
  PHYSIO_REPORT_CONFIGS,
  type PhysioReportProfile,
  findPhysioConfig,
  type DayCounts
} from '@/config/physioReportConfig';
import {
  generatePhysioDailyReport,
  type AggregationResult
} from '@/utils/dailyReportAggregator';
import { SHEET_ID } from '@/utils/sheetLeaderboard';
import { toast } from 'sonner';
import { Copy, Check, Calendar, RefreshCw } from 'lucide-react';

function getTodayKolkataISO(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(new Date());
  } catch (e) {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }
}

function getYesterdayKolkataISO(currentISO: string): string {
  const parts = currentISO.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() - 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function DailyReport() {
  const { profile } = useAuth();
  const isAdminOrManager = profile?.role === 'admin' || profile?.role === 'manager';

  const userPhysioConfig = useMemo<PhysioReportProfile | null>(() => {
    if (!profile?.full_name) return null;
    return findPhysioConfig(profile.full_name) || findPhysioConfig(profile.email || '');
  }, [profile?.full_name, profile?.email]);

  const [selectedPhysioKey, setSelectedPhysioKey] = useState<string>('dipti');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayKolkataISO());
  const [reportResult, setReportResult] = useState<AggregationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize selected physio key based on logged-in user
  useEffect(() => {
    if (userPhysioConfig) {
      setSelectedPhysioKey(userPhysioConfig.key);
    } else if (isAdminOrManager) {
      setSelectedPhysioKey('dipti');
    }
  }, [userPhysioConfig, isAdminOrManager]);

  // Determine active physio: strictly enforce own physio profile for non-admins
  const activePhysio = useMemo<PhysioReportProfile>(() => {
    if (!isAdminOrManager && userPhysioConfig) {
      return userPhysioConfig;
    }
    const found = PHYSIO_REPORT_CONFIGS.find(p => p.key === selectedPhysioKey);
    return found || userPhysioConfig || PHYSIO_REPORT_CONFIGS[0];
  }, [isAdminOrManager, userPhysioConfig, selectedPhysioKey]);

  const loadReport = useCallback(async (physio: PhysioReportProfile, dateISO: string) => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(physio.sheet)}&_cb=${Date.now()}`;
      const res = await fetch(csvUrl, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`Failed to fetch sheet data for ${physio.display}`);
      }

      const csvText = await res.text();
      const parsed = Papa.parse(csvText, { header: false, skipEmptyLines: false });
      const rawRows = parsed.data as any[][];

      const result = generatePhysioDailyReport(physio, dateISO, rawRows, true);
      setReportResult(result);
    } catch (err: any) {
      console.error('Error generating daily report:', err);
      setErrorMessage(err?.message || 'Failed to read spreadsheet data.');
      toast.error('Could not load report for selected date.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activePhysio && selectedDate) {
      loadReport(activePhysio, selectedDate);
    }
  }, [activePhysio, selectedDate, loadReport]);

  const handleCopy = async () => {
    if (!reportResult?.message) return;
    try {
      await navigator.clipboard.writeText(reportResult.message);
      setCopied(true);
      toast.success('Report text copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // Fallback manual selection
      toast.info('Please select and copy the text below.');
    }
  };

  const handleSetToday = () => {
    setSelectedDate(getTodayKolkataISO());
  };

  const handleSetYesterday = () => {
    setSelectedDate(getYesterdayKolkataISO(getTodayKolkataISO()));
  };

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main fixed>
        <div className='space-y-4 max-w-4xl mx-auto py-2'>
          {/* Header Controls: Minimal & Clean */}
          <div className='flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4'>
            <div>
              <h1 className='text-2xl font-bold tracking-tight text-foreground'>
                Daily Report
              </h1>
              <p className='text-xs text-muted-foreground mt-0.5'>
                Live clinical walk-in summary for WhatsApp group posting
              </p>
            </div>

            <div className='flex items-center flex-wrap gap-2'>
              {/* Physio Selector (Visible ONLY to Admin / Manager) */}
              {isAdminOrManager && (
                <div className='flex items-center gap-1.5'>
                  <span className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                    Physio:
                  </span>
                  <select
                    value={selectedPhysioKey}
                    onChange={(e) => setSelectedPhysioKey(e.target.value)}
                    className='bg-card text-foreground border border-input rounded-md px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary'
                  >
                    {PHYSIO_REPORT_CONFIGS.map((p) => (
                      <option key={p.key} value={p.key} className='bg-[#1e293b] text-[#f8fafc]'>
                        {p.display}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date Input */}
              <div className='flex items-center gap-1 bg-card border border-input rounded-md px-2 py-1'>
                <Calendar size={14} className='text-muted-foreground' />
                <input
                  type='date'
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className='bg-transparent text-foreground text-xs focus:outline-none'
                />
              </div>

              {/* Quick Date Buttons */}
              <button
                type='button'
                onClick={handleSetToday}
                className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                  selectedDate === getTodayKolkataISO()
                    ? 'bg-primary text-primary-foreground border-primary font-semibold'
                    : 'bg-card text-muted-foreground border-input hover:text-foreground'
                }`}
              >
                Today
              </button>
              <button
                type='button'
                onClick={handleSetYesterday}
                className='text-xs px-2.5 py-1 rounded-md border bg-card text-muted-foreground border-input hover:text-foreground transition-colors'
              >
                Yesterday
              </button>

              {/* Refresh Button */}
              <button
                type='button'
                onClick={() => loadReport(activePhysio, selectedDate)}
                title='Refresh data from sheet'
                className='p-1.5 rounded-md border border-input bg-card text-muted-foreground hover:text-foreground transition-colors'
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              </button>

              {/* Copy Button */}
              <button
                type='button'
                onClick={handleCopy}
                disabled={loading || !reportResult?.message}
                className='flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-medium px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50'
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className='p-3 text-xs rounded-md bg-destructive/15 text-destructive border border-destructive/20'>
              {errorMessage}
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className='p-8 text-center text-xs text-muted-foreground animate-pulse'>
              Reading {activePhysio.sheet}…
            </div>
          )}

          {/* Pure Plain-Text Block (Strict Requirement: Text and Nothing Else) */}
          {!loading && reportResult && (
            <div className='space-y-2'>
              <pre
                onClick={handleCopy}
                title='Click anywhere to copy'
                style={{
                  userSelect: 'all',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                }}
                className='w-full p-5 rounded-lg border border-border bg-card text-foreground text-sm leading-relaxed cursor-pointer shadow-sm hover:border-primary/50 transition-colors'
              >
                {reportResult.message}
              </pre>

              {/* Warnings / Notices */}
              {reportResult.warnings && reportResult.warnings.length > 0 && (
                <div className='text-[11px] text-muted-foreground italic px-1'>
                  Note: {reportResult.warnings.join(' ')}
                </div>
              )}
            </div>
          )}
        </div>
      </Main>
    </>
  );
}

export default DailyReport;

