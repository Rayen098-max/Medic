import { useEffect, useState, useMemo, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
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
import Papa from 'papaparse'

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

const CACHE_KEY = 'medic_tasks_cache_v2';
const CACHE_TIME_KEY = 'medic_tasks_cache_time_v2';

function shouldAutoFetch() {
  const lastFetchStr = localStorage.getItem(CACHE_TIME_KEY);
  if (!lastFetchStr) return true;
  
  const lastTime = new Date(parseInt(lastFetchStr, 10));
  const now = new Date();
  
  if (now.toDateString() !== lastTime.toDateString()) {
    return true; // different day
  }
  
  // same day, check slots: 12:00, 17:00, 20:00
  const slots = [12, 17, 20];
  const currentHour = now.getHours();
  const lastHour = lastTime.getHours();
  
  for (const slot of slots) {
    if (currentHour >= slot && lastHour < slot) {
      return true; // We crossed a schedule slot since last fetch
    }
  }
  return false;
}

import { DateCardsHeader, type DateSummary } from './components/date-cards-header'

function formatDisplayDate(raw: string): string {
  if (!raw) return 'Unknown Date';
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  }
  const parts = raw.split(/[\/\\]/);
  if (parts.length >= 2) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parts.length >= 3 ? parseInt(parts[2], 10) : 2026;
    const parsed = new Date(year, month, day);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    }
  }
  return raw;
}

function parseDateForSort(dStr: string): number {
  if (!dStr) return 0;
  const d = new Date(dStr);
  if (!isNaN(d.getTime())) return d.getTime();

  const parts = dStr.split(/[\/\\]/);
  if (parts.length >= 2) {
    const val1 = parseInt(parts[0], 10);
    const val2 = parseInt(parts[1], 10);
    const val3 = parts.length >= 3 ? parseInt(parts[2], 10) : 2026;
    const year = val3 < 100 ? 2000 + val3 : val3;
    if (val1 > 12) {
      return new Date(year, val2 - 1, val1).getTime();
    }
    if (val2 > 12) {
      return new Date(year, val1 - 1, val2).getTime();
    }
    return new Date(year, val2 - 1, val1).getTime();
  }
  return 0;
}

export function Tasks() {
  const [data, setData] = useState<TrackerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
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
        setLoading(false);
        setIsFetching(false);
        return;
      }
    } catch (err) {
      console.warn("Supabase tasks fetch error, checking Google Sheet:", err);
    }

    // 2. Fallback to direct Google Sheet fetching if Supabase table has no rows yet
    let tabName = 'Master Data';
    if (profile?.role === 'physio' && profile?.full_name) {
      const clean = profile.full_name.toLowerCase();
      const matched = KNOWN_PHYSIOS.find(p => clean.includes(p.toLowerCase()) || clean.includes(p.substring(0, 4).toLowerCase()));
      if (matched) {
        tabName = `Daily Tracker - ${matched}`;
      }
    }

    const userCacheKey = `${CACHE_KEY}_${profile?.id || 'guest'}`;
    if (!force && !shouldAutoFetch()) {
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

        // Forward-fill the Date field because Google Sheet date headers only appear once per group
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
          if (hasCustomer) {
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
      })
      .catch(err => {
        console.error("Error fetching data from sheet:", err);
        setLoading(false);
        setIsFetching(false);
      });
  }, [profile])

  useEffect(() => {
    if (profile) {
      fetchTasks();
    }
  }, [profile, fetchTasks])

  // Group attended tasks by consultation date into clean summary cards
  const dateSummaries = useMemo<DateSummary[]>(() => {
    if (!Array.isArray(data) || data.length === 0) return [];

    const map = new Map<string, { totalAttended: number; sentCount: number; displayDate: string; timestamp: number }>();

    data.forEach(row => {
      const rawDate = String(row.Date || 'No Date').trim();
      if (!rawDate) return;

      if (!map.has(rawDate)) {
        map.set(rawDate, {
          totalAttended: 0,
          sentCount: 0,
          displayDate: formatDisplayDate(rawDate),
          timestamp: parseDateForSort(rawDate),
        });
      }

      const entry = map.get(rawDate)!;
      entry.totalAttended += 1;

      // Completed/Sent if whatsapp was clicked or consult patient_id is linked
      const isSent = Boolean(row.whatsapp_sent_at || row.patient_id);
      if (isSent) {
        entry.sentCount += 1;
      }
    });

    const list: DateSummary[] = Array.from(map.entries()).map(([dateKey, stats]) => {
      const pendingCount = Math.max(0, stats.totalAttended - stats.sentCount);
      const percentage = stats.totalAttended > 0
        ? Math.round((stats.sentCount / stats.totalAttended) * 100)
        : 0;

      return {
        dateKey,
        displayDate: stats.displayDate,
        totalAttended: stats.totalAttended,
        sentCount: stats.sentCount,
        pendingCount,
        percentage,
      };
    });

    // Sort newest date first
    list.sort((a, b) => {
      const timeA = map.get(a.dateKey)?.timestamp || 0;
      const timeB = map.get(b.dateKey)?.timestamp || 0;
      return timeB - timeA;
    });

    return list;
  }, [data]);

  // Automatically select the latest date by default
  useEffect(() => {
    if (dateSummaries.length > 0 && (!selectedDate || !dateSummaries.some(d => d.dateKey === selectedDate))) {
      setSelectedDate(dateSummaries[0].dateKey);
    }
  }, [dateSummaries, selectedDate]);

  // Filter tasks to ONLY show customers for the selected date
  const selectedDateTasks = useMemo(() => {
    if (!selectedDate) return data;
    return data.filter(row => String(row.Date || '').trim() === selectedDate);
  }, [data, selectedDate]);

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
          title="Fetch data from sheet"
        >
          <RefreshCw size={18} className={isFetching ? "animate-spin" : ""} />
        </Button>
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Physio Consultation Tasks</h2>
            <p className='text-muted-foreground'>
              Attended customer consultations grouped by date. Click a date card below to view its follow-up list.
            </p>
          </div>
        </div>

        {/* Modern Soft-Card Date Header */}
        {dateSummaries.length > 0 && (
          <DateCardsHeader
            dateSummaries={dateSummaries}
            selectedDate={selectedDate}
            onSelectDate={(key) => setSelectedDate(key)}
          />
        )}
        
        {loading && data.length === 0 ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-muted-foreground animate-pulse">Loading attended consultations...</p>
          </div>
        ) : (
          <TasksTable data={selectedDateTasks} />
        )}
      </Main>
    </>
  )
}
