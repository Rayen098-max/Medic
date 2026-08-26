import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Types for the data from Google Sheets
interface TrackerRow {
  Date: string;
  "Physio Name": string;
  "Customer Name": string;
  "Customer Number": string;
  "Physio session Done": string;
  "Product suggested": string;
  Converted: string;
  "When was the session"?: string;
  "Duration of session"?: string;
  "Exercise and changes in lifestyle"?: string;
}

export function Dashboard() {
  const { profile } = useAuth()
  const [data, setData] = useState<TrackerRow[]>([])
  const [loading, setLoading] = useState(true)

  // Filter States
  const [selectedMonth, setSelectedMonth] = useState<string>('all')
  
  // Set initial selected physio to 'all' for admins, or the physio's own name for physios
  const initialPhysio = profile?.role === 'physio' && profile?.physioName 
    ? profile.physioName.toLowerCase() 
    : 'all';
    
  const [selectedPhysio, setSelectedPhysio] = useState<string>(initialPhysio)
  
  // Enforce RBAC: If role is physio, they cannot change this filter
  const isPhysioLocked = profile?.role === 'physio';

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

  // Derive unique months and physios for filters
  const uniqueMonths = useMemo(() => {
    const months = new Set<string>()
    data.forEach(row => {
      // Very basic parsing, assume Date is some string. If empty, maybe "Unknown"
      const dateStr = row.Date ? row.Date.trim() : "Unknown Date"
      // If it contains a month string, we might just use the raw date for now if parsing is complex,
      // but let's assume it's roughly "MMM-YYYY" or similar. We'll just group by the raw string for simplicity if it's month-like.
      if (dateStr) months.add(dateStr)
    })
    return Array.from(months)
  }, [data])

  const uniquePhysios = useMemo(() => {
    const physios = new Set<string>()
    data.forEach(row => {
      if (row["Physio Name"]) physios.add(row["Physio Name"].trim())
    })
    return Array.from(physios)
  }, [data])

  // Apply filters
  const filteredData = useMemo(() => {
    return data.filter(row => {
      const matchMonth = selectedMonth === 'all' || (row.Date || 'Unknown Date') === selectedMonth
      const matchPhysio = selectedPhysio === 'all' || row["Physio Name"] === selectedPhysio
      return matchMonth && matchPhysio
    })
  }, [data, selectedMonth, selectedPhysio])

  // --- KPI Calculations based on filtered data ---
  const totalSessionsPitched = filteredData.length;
  
  const sessionsDoneCount = filteredData.filter(row => 
    row["Physio session Done"] && row["Physio session Done"].toLowerCase().includes('yes')
  ).length;

  const convertedSessions = filteredData.filter(row => 
    row.Converted && row.Converted.toLowerCase().includes('yes')
  ).length;
  const conversionRate = totalSessionsPitched > 0 ? ((convertedSessions / totalSessionsPitched) * 100).toFixed(2) : '0.00';

  const uniqueCustomers = new Set(filteredData.map(row => row['Customer Number'])).size;
  const repeatRate = totalSessionsPitched > 0 ? (((totalSessionsPitched - uniqueCustomers) / totalSessionsPitched) * 100).toFixed(2) : '0.00';

  // Extract latest 5 entries for the per-session cards
  const recentSessionsData = filteredData.slice(-5).reverse();

  return (
    <>
      <Header>
        <TopNav links={topNav} className='me-auto' />
        <Search />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main>
        <div className='mb-2 flex items-center justify-between space-y-2'>
          <h1 className='text-2xl font-bold tracking-tight'>Physio Performance Dashboard</h1>
        </div>
        
        {/* Filters Section */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-muted-foreground">Filter by Month</label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Months" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {uniqueMonths.map(month => (
                  <SelectItem key={month} value={month}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-muted-foreground">Filter by Physio</label>
            <Select value={selectedPhysio} onValueChange={setSelectedPhysio} disabled={isPhysioLocked}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Physios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Physios</SelectItem>
                {uniquePhysios.map(physio => (
                  <SelectItem key={physio} value={physio}>{physio}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-muted-foreground animate-pulse">Fetching live data from Google Sheets...</p>
          </div>
        ) : (
          <Tabs orientation='vertical' defaultValue='overview' className='space-y-4'>
            <div className='w-full overflow-x-auto pb-2'>
              <TabsList>
                <TabsTrigger value='overview'>Overview</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value='overview' className='space-y-4'>
              
              {/* Primary KPIs */}
              <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                <Card>
                  <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                    <CardTitle className='text-sm font-medium'>Sessions Pitched</CardTitle>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </CardHeader>
                  <CardContent>
                    <div className='text-2xl font-bold'>{totalSessionsPitched}</div>
                    <p className="text-xs text-muted-foreground">Total customers approached</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                    <CardTitle className='text-sm font-medium'>Sessions Done</CardTitle>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
                  </CardHeader>
                  <CardContent>
                    <div className='text-2xl font-bold text-green-500'>{sessionsDoneCount}</div>
                    <p className="text-xs text-muted-foreground">Successfully completed sessions</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                    <CardTitle className='text-sm font-medium'>Conversion Rate</CardTitle>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                  </CardHeader>
                  <CardContent>
                    <div className='text-2xl font-bold text-blue-500'>{conversionRate}%</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                    <CardTitle className='text-sm font-medium'>Repeat Rate</CardTitle>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                  </CardHeader>
                  <CardContent>
                    <div className='text-2xl font-bold text-purple-500'>{repeatRate}%</div>
                  </CardContent>
                </Card>
              </div>

              {/* Per-Session Detail Cards */}
              <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                
                <Card className="col-span-1">
                  <CardHeader>
                    <CardTitle>Session Timings</CardTitle>
                    <CardDescription>When recent sessions took place</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {recentSessionsData.map((row, i) => (
                        <li key={i} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                          <span className="font-medium truncate mr-2">{row["Customer Name"]}</span>
                          <span className="text-muted-foreground whitespace-nowrap">{row["When was the session"] || 'N/A'}</span>
                        </li>
                      ))}
                      {recentSessionsData.length === 0 && <li className="text-sm text-muted-foreground">No data available</li>}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="col-span-1">
                  <CardHeader>
                    <CardTitle>Session Durations</CardTitle>
                    <CardDescription>Duration of recent sessions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {recentSessionsData.map((row, i) => (
                        <li key={i} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                          <span className="font-medium truncate mr-2">{row["Customer Name"]}</span>
                          <span className="text-muted-foreground whitespace-nowrap">{row["Duration of session"] || 'N/A'}</span>
                        </li>
                      ))}
                      {recentSessionsData.length === 0 && <li className="text-sm text-muted-foreground">No data available</li>}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="col-span-1">
                  <CardHeader>
                    <CardTitle>Lifestyle Changes</CardTitle>
                    <CardDescription>Exercises & changes suggested</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {recentSessionsData.map((row, i) => (
                        <li key={i} className="flex flex-col text-sm border-b pb-2 last:border-0">
                          <span className="font-medium">{row["Customer Name"]}</span>
                          <span className="text-muted-foreground mt-1">{row["Exercise and changes in lifestyle"] || 'N/A'}</span>
                        </li>
                      ))}
                      {recentSessionsData.length === 0 && <li className="text-sm text-muted-foreground">No data available</li>}
                    </ul>
                  </CardContent>
                </Card>

              </div>
            </TabsContent>
          </Tabs>
        )}
      </Main>
    </>
  )
}

const topNav = [
  {
    title: 'Overview',
    href: '/dashboard',
    isActive: true,
    disabled: false,
  }
]

