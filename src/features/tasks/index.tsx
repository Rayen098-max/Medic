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
      userFilteredData = data.filter(row => row['Physio Name']?.trim().toLowerCase() === profile.full_name.trim().toLowerCase());
    }

    if (userFilteredData.length === 0) return [];

    // Extract unique dates and parse them to sort descending
    // Dates are formatted like "26/8", "25/8", etc.
    const uniqueDates = Array.from(new Set(userFilteredData.map(row => row.Date?.trim()).filter(Boolean)));
    
    // Simple sort based on raw format since it seems to be day/month. 
    // For robust parsing, we split and convert to numbers.
    uniqueDates.sort((a, b) => {
      const [dayA, monthA] = a.split('/').map(Number);
      const [dayB, monthB] = b.split('/').map(Number);
      if (monthA !== monthB) return (monthB || 0) - (monthA || 0);
      return (dayB || 0) - (dayA || 0);
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
