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
import Papa from 'papaparse'
interface TrackerRow {
  Date: string;
  "Physio Name": string;
  "Customer Name": string;
  "Customer Number": string;
  "Physio session Done": string;
  Dates?: string;
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

export function Tasks() {
  const [data, setData] = useState<TrackerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const { profile } = useAuth()

  const fetchTasks = useCallback((force = false) => {
    let tabName = 'Master Data';
    if (profile?.role === 'physio' && profile?.full_name) {
      const clean = profile.full_name.toLowerCase();
      const matched = KNOWN_PHYSIOS.find(p => clean.includes(p.toLowerCase()) || clean.includes(p.substring(0, 4).toLowerCase()));
      if (matched) {
        tabName = `Daily Tracker - ${matched}`;
      }
    }

    if (!force && !shouldAutoFetch()) {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            setData(parsed);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error("Cache parsing error", e);
        }
      }
    }

    setIsFetching(true);
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
        localStorage.setItem(CACHE_KEY, JSON.stringify(filledData));
        localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
        setLoading(false);
        setIsFetching(false);
      })
      .catch(err => {
        console.error("Error fetching data:", err)
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            try { 
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed)) setData(parsed); 
            } catch(e){}
        }
        setLoading(false);
        setIsFetching(false);
      })
  }, [profile])

  useEffect(() => {
    if (profile) {
      fetchTasks();
    }
  }, [profile, fetchTasks])

  const filteredTasks = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];

    const parseDate = (dStr: string) => {
      if (!dStr) return 0;
      
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
      
      let d = new Date(dStr);
      if (!isNaN(d.getTime())) return d.getTime();
      
      return 0;
    };

    // Include all data from August 28, 2026 onwards
    const AUG_28_2026 = new Date(2026, 7, 28).getTime(); // Note: month is 0-indexed (7 = August)

    return data.filter(row => {
      const val = row.Date;
      const dateStr = typeof val === 'string' ? val.trim() : (val ? String(val).trim() : undefined);
      if (!dateStr) return false;
      
      const timestamp = parseDate(dateStr);
      return timestamp >= AUG_28_2026;
    });
  }, [data]);

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
            <h2 className='text-2xl font-bold tracking-tight'>Tasks (Latest Available Dates)</h2>
            <p className='text-muted-foreground'>
              Here are your consultation reports to follow up on.
            </p>
          </div>
        </div>
        
        {loading && data.length === 0 ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-muted-foreground animate-pulse">Fetching live data from Google Sheets...</p>
          </div>
        ) : (
          <TasksTable data={filteredTasks} />
        )}
      </Main>
    </>
  )
}
