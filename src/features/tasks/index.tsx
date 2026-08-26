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
}

export function Tasks() {
  const [data, setData] = useState<TrackerRow[]>([])
  const [loading, setLoading] = useState(true)
  const { profile } = useAuth()

  useEffect(() => {
    // Fetch live data from Google Sheets via Opensheet API
    fetch('https://opensheet.elk.sh/1tKa5y8t7PxuqBTMJSwJRDLI9SJX5X00aeSZ8fcQwmsU/Master%20Data')
      .then(res => res.json())
      .then((json: TrackerRow[]) => {
        setData(json)
        setLoading(false)
      })
      .catch(err => {
        console.error("Error fetching data:", err)
        setLoading(false)
      })
  }, [])

  const filteredTasks = useMemo(() => {
    if (data.length === 0) return [];
    
    // First, filter by the logged in user if they are a physio
    let userFilteredData = data;
    if (profile?.role === 'physio' && profile?.full_name) {
      const profileName = profile.full_name.trim().toLowerCase();
      userFilteredData = data.filter(row => {
        const sheetName = row['Physio Name']?.trim().toLowerCase();
        return sheetName && profileName && (profileName.includes(sheetName) || sheetName.includes(profileName));
      });
    }

    if (userFilteredData.length === 0) return [];

    // Extract unique dates and parse them to sort descending
    // Dates are formatted like "26/8", "25/8", "8/24/2026", etc.
    const uniqueDates = Array.from(new Set(userFilteredData.map(row => row.Date?.trim()).filter(Boolean)));
    
    // Robust date sorting to handle various formats from the sheet
    uniqueDates.sort((a, b) => {
      const parseDate = (dStr: string) => {
        if (!dStr) return 0;
        let d = new Date(dStr);
        if (!isNaN(d.getTime())) return d.getTime();
        
        // Fallback for DD/MM or DD/MM/YYYY formats that native Date fails to parse
        const parts = dStr.split(/[\/\\]/);
        if (parts.length >= 2) {
           const val1 = parseInt(parts[0], 10);
           const val2 = parseInt(parts[1], 10);
           // assume val1 is day, val2 is month
           d = new Date(new Date().getFullYear(), val2 - 1, val1);
           if (!isNaN(d.getTime())) return d.getTime();
        }
        return 0;
      };
      return parseDate(b) - parseDate(a);
    });

    // Take the two latest available dates for this user
    const targetDates = uniqueDates.slice(0, 2);

    if (targetDates.length === 0) return [];

    return userFilteredData.filter(row => targetDates.includes(row.Date?.trim()));
  }, [data, profile]);

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
