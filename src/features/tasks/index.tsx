import { useEffect, useState, useMemo, useCallback } from 'react'
import { RefreshCw, Calendar, ArrowLeft, ChevronRight, Layers, Users, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { TasksTable } from './components/tasks-table'
import { useAuth } from '@/context/AuthContext'
import { getTrackerTasks } from '@/utils/db'
import { MonthCardsHeader, type MonthSummary } from './components/month-cards-header'
import { DateCardsHeader, type DateSummary } from './components/date-cards-header'
import Papa from 'papaparse'
import { toast } from 'sonner'

interface TrackerRow {
  id?: string;
  Date: string;
  "Physio Name": string;
  "Customer Name": string;
  "Customer Number": string;
  "Physio session Done": string;
  Dates?: string;
  patient_id?: string | null;
  whatsapp_sent_at?: string | null;
}

const KNOWN_PHYSIOS = ['Aishwarya', 'Gursheen', 'Dipti', 'Rutuja', 'Pooja', 'Hritika', 'Kritika', 'Gaurav'];

const CACHE_KEY = 'medic_tasks_cache_v3';
const CACHE_TIME_KEY = 'medic_tasks_cache_time_v3';

export interface DateMeta {
  isoDate: string;       // "2026-10-15"
  displayDate: string;   // "15 Oct"
  monthKey: string;      // "2026-10"
  monthName: string;     // "October 2026"
  timestamp: number;     // for numeric sorting
}

export function parseDateMetadata(raw: string): DateMeta {
  if (!raw) {
    return { isoDate: '', displayDate: 'No Date', monthKey: 'nodate', monthName: 'Other', timestamp: 0 };
  }
  const str = String(raw).trim();

  // 1. Check ISO YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    const dt = new Date(year, month - 1, day);
    const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    const monthName = dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const displayDate = dt.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    return { isoDate, displayDate, monthKey, monthName, timestamp: dt.getTime() };
  }

  // 2. Check Indian DD/MM or DD/MM/YYYY or DD-MM-YYYY
  const slashParts = str.split(/[\/\-]/);
  if (slashParts.length >= 2) {
    const d = parseInt(slashParts[0], 10);
    const m = parseInt(slashParts[1], 10);
    const y = slashParts.length >= 3 ? parseInt(slashParts[2], 10) : 2026;
    const year = y < 100 ? 2000 + y : y;
    if (!isNaN(d) && !isNaN(m) && d >= 1 && d <= 31 && m >= 1 && m <= 12) {
      const dt = new Date(year, m - 1, d);
      const isoDate = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const monthKey = `${year}-${String(m).padStart(2, '0')}`;
      const monthName = dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const displayDate = dt.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      return { isoDate, displayDate, monthKey, monthName, timestamp: dt.getTime() };
    }
  }

  // 3. Fallback for JS Date string
  const dt = new Date(str);
  if (!isNaN(dt.getTime())) {
    const year = dt.getFullYear();
    const month = dt.getMonth() + 1;
    const day = dt.getDate();
    const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    const monthName = dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const displayDate = dt.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    return { isoDate, displayDate, monthKey, monthName, timestamp: dt.getTime() };
  }

  return { isoDate: str, displayDate: str, monthKey: 'Other', monthName: 'Other', timestamp: 0 };
}

export function Tasks() {
  const [data, setData] = useState<TrackerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  
  // 3-Level Navigation state
  const [viewMode, setViewMode] = useState<'months' | 'dates' | 'list'>('months')
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>('')
  
  const { profile } = useAuth()

  const fetchTasks = useCallback(async (force = false) => {
    setIsFetching(true);

    // 1. Try fetching directly from Supabase first
    try {
      const supabaseTasks = await getTrackerTasks(profile);
      if (Array.isArray(supabaseTasks) && supabaseTasks.length > 0) {
        // Strictly filter for customers where session_done === 'Yes'
        const attendedOnly = supabaseTasks.filter(t => {
          const done = String(t.session_done || '').trim().toLowerCase();
          return done === 'yes';
        });

        const mapped: TrackerRow[] = attendedOnly.map(t => ({
          id: t.id,
          Date: t.consult_date || '',
          "Physio Name": t.physio_name || '',
          "Customer Name": t.customer_name || '',
          "Customer Number": t.customer_phone || '',
          "Physio session Done": t.session_done || '',
          patient_id: t.patient_id,
          whatsapp_sent_at: t.whatsapp_sent_at
        }));

        setData(mapped);
        const userCacheKey = `${CACHE_KEY}_${profile?.id || 'guest'}`;
        localStorage.setItem(userCacheKey, JSON.stringify(mapped));
        localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
        setLoading(false);
        setIsFetching(false);
        if (force) {
          toast.success("Tasks refreshed successfully from Supabase!");
        }
        return;
      }
    } catch (err) {
      console.warn("Supabase tasks fetch error, checking Google Sheet:", err);
    }

    // 2. Fallback to direct Google Sheet fetching if Supabase table has no rows
    let tabName = 'Master Data';
    if (profile?.role === 'physio' && profile?.full_name) {
      const clean = profile.full_name.toLowerCase();
      const matched = KNOWN_PHYSIOS.find(p => clean.includes(p.toLowerCase()) || clean.includes(p.substring(0, 4).toLowerCase()));
      if (matched) {
        tabName = `Daily Tracker - ${matched}`;
      }
    }

    const userCacheKey = `${CACHE_KEY}_${profile?.id || 'guest'}`;
    if (!force) {
      const cached = localStorage.getItem(userCacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setData(parsed);
            setLoading(false);
            setIsFetching(false);
            return;
          }
        } catch (e) {
          console.error("Cache parsing error", e);
        }
      }
    }

    const csvUrl = `https://docs.google.com/spreadsheets/d/1tKa5y8t7PxuqBTMJSwJRDLI9SJX5X00aeSZ8fcQwmsU/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}&_cb=${Date.now()}`;
    
    fetch(csvUrl, { cache: 'no-store' })
      .then(res => res.text())
      .then(csv => {
        const result = Papa.parse(csv, { 
          header: true, 
          skipEmptyLines: true,
          transformHeader: (h) => {
            let ht = h.trim();
            if (ht.toLowerCase().startsWith('date')) return 'Date';
            if (ht.toLowerCase() === 'name') return 'Customer Name';
            return ht;
          }
        });
        const json = result.data as TrackerRow[];

        let lastDate = '';
        const filledData: TrackerRow[] = [];

        for (const row of json) {
          const val = row.Date || row.Dates;
          const rawDate = typeof val === 'string' ? val.trim() : (val ? String(val).trim() : undefined);
          if (rawDate && rawDate !== '' && !['Start', 'Mid', 'End', 'cc', 'no cc'].includes(rawDate)) {
            lastDate = rawDate;
          }
          const nameVal = row['Customer Name'];
          const numVal = row['Customer Number'];
          const hasCustomer = (nameVal && String(nameVal).trim() !== '') || 
                              (numVal && String(numVal).trim() !== '');
          const isAttended = String(row['Physio session Done'] || '').trim().toLowerCase() === 'yes';

          if (hasCustomer && isAttended) {
            filledData.push({
              ...row,
              Date: lastDate
            });
          }
        }

        setData(filledData);
        localStorage.setItem(userCacheKey, JSON.stringify(filledData));
        localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
        setLoading(false);
        setIsFetching(false);
        if (force) {
          toast.success("Tasks refreshed from Google Sheet!");
        }
      })
      .catch(err => {
        console.error("Error fetching data from sheet:", err);
        setLoading(false);
        setIsFetching(false);
        toast.error("Failed to refresh tasks.");
      });
  }, [profile])

  useEffect(() => {
    if (profile) {
      fetchTasks();
    }
  }, [profile, fetchTasks])

  // Attach pre-calculated date metadata to each attended task
  const enhancedTasks = useMemo(() => {
    return data.map(row => ({
      ...row,
      _meta: parseDateMetadata(row.Date)
    }));
  }, [data]);

  // Level 1: Month Summaries (Sorted descending: October first, September second, etc.)
  const monthSummaries = useMemo<MonthSummary[]>(() => {
    if (enhancedTasks.length === 0) return [];

    const monthMap = new Map<string, {
      monthKey: string;
      monthName: string;
      totalAttended: number;
      sentCount: number;
      timestamp: number;
      datesSet: Set<string>;
    }>();

    enhancedTasks.forEach(task => {
      const { monthKey, monthName, isoDate, timestamp } = task._meta;
      if (!monthKey || monthKey === 'nodate') return;

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          monthKey,
          monthName,
          totalAttended: 0,
          sentCount: 0,
          timestamp,
          datesSet: new Set<string>()
        });
      }

      const entry = monthMap.get(monthKey)!;
      entry.totalAttended += 1;
      if (isoDate) entry.datesSet.add(isoDate);

      const isSent = Boolean(task.whatsapp_sent_at || task.patient_id);
      if (isSent) {
        entry.sentCount += 1;
      }
    });

    const list: MonthSummary[] = Array.from(monthMap.values()).map(m => {
      const pendingCount = Math.max(0, m.totalAttended - m.sentCount);
      const percentage = m.totalAttended > 0
        ? Math.round((m.sentCount / m.totalAttended) * 100)
        : 0;

      return {
        monthKey: m.monthKey,
        monthName: m.monthName,
        totalAttended: m.totalAttended,
        sentCount: m.sentCount,
        pendingCount,
        percentage,
        timestamp: m.timestamp,
        dateCount: m.datesSet.size,
      };
    });

    // Sort descending by timestamp (Newest month first!)
    list.sort((a, b) => b.timestamp - a.timestamp);

    return list;
  }, [enhancedTasks]);

  // Level 2: Date Summaries for the selected month (Sorted descending: newest date first!)
  const dateSummaries = useMemo<DateSummary[]>(() => {
    if (!selectedMonth || enhancedTasks.length === 0) return [];

    const dateMap = new Map<string, {
      dateKey: string;
      displayDate: string;
      totalAttended: number;
      sentCount: number;
      timestamp: number;
    }>();

    enhancedTasks
      .filter(t => t._meta.monthKey === selectedMonth)
      .forEach(task => {
        const { isoDate, displayDate, timestamp } = task._meta;
        const key = isoDate || 'nodate';

        if (!dateMap.has(key)) {
          dateMap.set(key, {
            dateKey: key,
            displayDate,
            totalAttended: 0,
            sentCount: 0,
            timestamp
          });
        }

        const entry = dateMap.get(key)!;
        entry.totalAttended += 1;

        const isSent = Boolean(task.whatsapp_sent_at || task.patient_id);
        if (isSent) {
          entry.sentCount += 1;
        }
      });

    const list: DateSummary[] = Array.from(dateMap.values()).map(d => {
      const pendingCount = Math.max(0, d.totalAttended - d.sentCount);
      const percentage = d.totalAttended > 0
        ? Math.round((d.sentCount / d.totalAttended) * 100)
        : 0;

      return {
        dateKey: d.dateKey,
        displayDate: d.displayDate,
        totalAttended: d.totalAttended,
        sentCount: d.sentCount,
        pendingCount,
        percentage,
        timestamp: d.timestamp,
      };
    });

    // Sort descending by timestamp (Newest date first!)
    list.sort((a, b) => b.timestamp - a.timestamp);

    return list;
  }, [enhancedTasks, selectedMonth]);

  // Level 3: Tasks for the selected date
  const selectedDateTasks = useMemo(() => {
    if (!selectedDate) return [];
    return enhancedTasks.filter(t => t._meta.isoDate === selectedDate || t.Date === selectedDate);
  }, [enhancedTasks, selectedDate]);

  // Active Month Meta info
  const activeMonthMeta = useMemo(() => {
    return monthSummaries.find(m => m.monthKey === selectedMonth);
  }, [monthSummaries, selectedMonth]);

  // Active Date Meta info
  const activeDateMeta = useMemo(() => {
    return dateSummaries.find(d => d.dateKey === selectedDate);
  }, [dateSummaries, selectedDate]);

  // Navigation Handlers
  const handleSelectMonth = (monthKey: string) => {
    setSelectedMonth(monthKey);
    setViewMode('dates');
  };

  const handleSelectDate = (dateKey: string) => {
    setSelectedDate(dateKey);
    setViewMode('list');
  };

  const handleBackToMonths = () => {
    setViewMode('months');
  };

  const handleBackToDates = () => {
    setViewMode('dates');
  };

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <Button 
          variant='ghost' 
          size='icon' 
          className='scale-95 rounded-full' 
          onClick={() => fetchTasks(true)} 
          disabled={isFetching}
          title="Fetch fresh data from Supabase"
        >
          <RefreshCw size={18} className={isFetching ? "animate-spin" : ""} />
        </Button>
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        {/* Dynamic Breadcrumbs & Page Header */}
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            {/* Breadcrumb path */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5 font-medium">
              <button 
                onClick={handleBackToMonths}
                className={`hover:text-primary transition-colors cursor-pointer ${viewMode === 'months' ? 'text-primary font-semibold' : ''}`}
              >
                All Months
              </button>

              {selectedMonth && activeMonthMeta && (
                <>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                  <button 
                    onClick={handleBackToDates}
                    className={`hover:text-primary transition-colors cursor-pointer ${viewMode === 'dates' ? 'text-primary font-semibold' : ''}`}
                  >
                    {activeMonthMeta.monthName}
                  </button>
                </>
              )}

              {selectedDate && activeDateMeta && viewMode === 'list' && (
                <>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                  <span className="text-foreground font-semibold">
                    {activeDateMeta.displayDate}
                  </span>
                </>
              )}
            </div>

            <h2 className='text-2xl font-bold tracking-tight'>
              {viewMode === 'months' && 'Physio Consultation Tasks'}
              {viewMode === 'dates' && `${activeMonthMeta?.monthName || 'Month'} Consultation Dates`}
              {viewMode === 'list' && `${activeDateMeta?.displayDate || 'Date'} Follow-up List`}
            </h2>
            <p className='text-muted-foreground text-sm'>
              {viewMode === 'months' && 'Attended customer consultations grouped by month. Select a month to view its consultation dates.'}
              {viewMode === 'dates' && 'Showing all attended consultation dates (newest first). Click a date card to open its follow-up list.'}
              {viewMode === 'list' && 'Follow up with customers attended on this date via WhatsApp or consult submission.'}
            </p>
          </div>
        </div>

        {/* Loading state */}
        {loading && data.length === 0 ? (
          <div className="flex h-48 items-center justify-center">
            <p className="text-muted-foreground animate-pulse">Loading attended consultations from Supabase...</p>
          </div>
        ) : (
          <>
            {/* LEVEL 1: MONTH CARDS */}
            {viewMode === 'months' && (
              <MonthCardsHeader
                monthSummaries={monthSummaries}
                onSelectMonth={handleSelectMonth}
              />
            )}

            {/* LEVEL 2: DATE CARDS */}
            {viewMode === 'dates' && (
              <DateCardsHeader
                monthName={activeMonthMeta?.monthName || 'Selected Month'}
                dateSummaries={dateSummaries}
                selectedDate={selectedDate}
                onSelectDate={handleSelectDate}
                onBackToMonths={handleBackToMonths}
              />
            )}

            {/* LEVEL 3: TASKS TABLE (NO SCROLL DOWN REQUIRED) */}
            {viewMode === 'list' && (
              <div className="space-y-4">
                {/* Back to Dates action bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-card/50 p-3 rounded-xl border border-border/60">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBackToDates}
                      className="gap-1.5 h-8 px-3 text-xs font-semibold hover:bg-muted/80 cursor-pointer"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back to {activeMonthMeta?.monthName || 'Dates'}
                    </Button>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="font-bold text-sm text-foreground">
                        {activeDateMeta?.displayDate} Consultations
                      </span>
                    </div>
                  </div>

                  {activeDateMeta && (
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-muted-foreground flex items-center gap-1 font-medium">
                        <Users className="h-3.5 w-3.5" /> {activeDateMeta.totalAttended} Attended
                      </span>
                      <span className="text-emerald-500 flex items-center gap-1 font-semibold">
                        <Send className="h-3.5 w-3.5" /> {activeDateMeta.sentCount} Sent
                      </span>
                      {activeDateMeta.pendingCount > 0 ? (
                        <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full font-semibold text-[11px]">
                          {activeDateMeta.pendingCount} Pending
                        </span>
                      ) : (
                        <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold text-[11px]">
                          All Completed
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Immediately visible customer table without any scroll past cards */}
                <TasksTable data={selectedDateTasks} />
              </div>
            )}
          </>
        )}
      </Main>
    </>
  )
}
