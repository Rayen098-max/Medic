import { useEffect, useState, useMemo } from 'react'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { TasksTable } from './components/tasks-table'
import { useAuth } from '@/context/AuthContext'

interface TrackerRow {
  Date: string;
  "Physio Name": string;
  "Customer Name": string;
  "Customer Number": string;
  "Physio session Done": string;
  Dates?: string;
}

const KNOWN_PHYSIOS = ['Aishwarya', 'Gursheen', 'Dipti', 'Rutuja', 'Pooja', 'Hritika', 'Kritika', 'Gaurav'];

export function Tasks() {
  const [data, setData] = useState<TrackerRow[]>([])
  const [loading, setLoading] = useState(true)
  const { profile } = useAuth()

  useEffect(() => {
    let tabName = 'Master Data';
    if (profile?.role === 'physio' && profile?.full_name) {
      const clean = profile.full_name.toLowerCase();
      const matched = KNOWN_PHYSIOS.find(p => clean.includes(p.toLowerCase()) || clean.includes(p.substring(0, 4).toLowerCase()));
      if (matched) {
        tabName = `Daily Tracker - ${matched}`;
      }
    }

    setLoading(true);
    fetch(`https://opensheet.elk.sh/1tKa5y8t7PxuqBTMJSwJRDLI9SJX5X00aeSZ8fcQwmsU/${encodeURIComponent(tabName)}`)
      .then(res => res.json())
      .then((json: TrackerRow[]) => {
        // Forward-fill the Date field because Google Sheet date headers only appear once per group
        let lastDate = '';
        const filledData: TrackerRow[] = [];

        for (const row of json) {
          const rawDate = (row.Date || row.Dates)?.trim();
          if (rawDate && rawDate !== '' && !['Start', 'Mid', 'End', 'cc', 'no cc'].includes(rawDate)) {
            lastDate = rawDate;
          }
          // Only include rows that actually represent a customer entry
          const hasCustomer = (row['Customer Name'] && row['Customer Name'].trim() !== '') || 
                              (row['Customer Number'] && row['Customer Number'].trim() !== '');
          if (hasCustomer) {
            filledData.push({
              ...row,
              Date: lastDate
            });
          }
        }

        setData(filledData);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching data:", err)
        setLoading(false)
      })
  }, [profile])

  const filteredTasks = useMemo(() => {
    if (data.length === 0) return [];

    // Extract unique dates in reverse chronological order
    const uniqueDates = Array.from(new Set(data.map(row => row.Date?.trim()).filter(Boolean)));
    
    // Robust date sorting to handle various formats from the sheet (e.g. 24/8, 23/8, 8/24/2026)
    uniqueDates.sort((a, b) => {
      const parseDate = (dStr: string) => {
        if (!dStr) return 0;
        let d = new Date(dStr);
        if (!isNaN(d.getTime())) return d.getTime();
        
        const parts = dStr.split(/[\/\\]/);
        if (parts.length >= 2) {
           const val1 = parseInt(parts[0], 10);
           const val2 = parseInt(parts[1], 10);
           // assume val1 is day, val2 is month
           d = new Date(2026, val2 - 1, val1);
           if (!isNaN(d.getTime())) return d.getTime();
        }
        return 0;
      };
      return parseDate(b) - parseDate(a);
    });

    // Take the two latest available dates for this user
    const targetDates = uniqueDates.slice(0, 2);

    if (targetDates.length === 0) return [];

    return data.filter(row => targetDates.includes(row.Date?.trim()));
  }, [data]);

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
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
        
        {loading ? (
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
