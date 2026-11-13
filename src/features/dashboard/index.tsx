import { useEffect, useState, useMemo } from 'react'
import Papa from 'papaparse'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getDashboardTrackerData } from '@/utils/db'

// Types for the data from Google Sheets & Supabase
interface TrackerRow {
  Date: string;
  "Physio Name": string;
  "Customer Name": string;
  "Customer Number": string;
  "Primary Category"?: string;
  "Physio Pitched"?: string;
  "Physio session Done": string;
  "When was the session"?: string;
  "Staff Name"?: string;
  "Reason (If Not done)"?: string;
  "Duration of session"?: string;
  "Product suggested"?: string;
  "Exercise and changes in lifestyle"?: string;
  "Whatsapp followup done"?: string;
  Converted?: string;
  "Customer Concern/Painpoint"?: string;
}

export function Dashboard() {
  const [data, setData] = useState<TrackerRow[]>([])
  const [loading, setLoading] = useState(true)

  // Filter States
  const [selectedMonth, setSelectedMonth] = useState<string>('all')
  const [selectedPhysio, setSelectedPhysio] = useState<string>('all')

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        // 1. Try authoritative Supabase tracker tasks first
        const dbTasks = await getDashboardTrackerData();
        if (isMounted && Array.isArray(dbTasks) && dbTasks.length > 0) {
          setData(dbTasks as TrackerRow[]);
          setLoading(false);
          return;
        }

        // 2. Fallback to Google Sheets
        const csvUrl = `https://docs.google.com/spreadsheets/d/1tKa5y8t7PxuqBTMJSwJRDLI9SJX5X00aeSZ8fcQwmsU/gviz/tq?tqx=out:csv&sheet=Master%20Data&_cb=${Date.now()}`;
        const res = await fetch(csvUrl, { cache: 'no-store' });
        const csv = await res.text();
        const result = Papa.parse(csv, { header: true, skipEmptyLines: true });
        if (isMounted) {
          setData(result.data as TrackerRow[]);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [])

  // Derived filter options - strictly September, October, November
  const monthOptions = [
    { key: 'all', label: 'All Active Months' },
    { key: '2026-11', label: 'November 2026' },
    { key: '2026-10', label: 'October 2026' },
    { key: '2026-09', label: 'September 2026' },
  ];

  const uniquePhysios = useMemo(() => {
    const physios = new Set<string>()
    data.forEach(row => {
      if (row["Physio Name"]) physios.add(row["Physio Name"].trim())
    })
    return Array.from(physios).sort()
  }, [data])

  // Apply global filters
  const filteredData = useMemo(() => {
    return data.filter(row => {
      const matchMonth = selectedMonth === 'all' || (row.Date && row.Date.startsWith(selectedMonth));
      const matchPhysio = selectedPhysio === 'all' || row["Physio Name"].trim().toLowerCase() === selectedPhysio.trim().toLowerCase();
      return matchMonth && matchPhysio
    })
  }, [data, selectedMonth, selectedPhysio])

  // --- KPI Cards Calculations ---
  const totalSessionsPitched = filteredData.length;
  
  const doneRows = filteredData.filter(row => row["Physio session Done"]?.toLowerCase() === 'yes' || row["Physio session Done"]?.toLowerCase() === 'true');
  const sessionsDoneCount = doneRows.length;

  const followupsSentCount = filteredData.filter(row => row["Whatsapp followup done"]?.toLowerCase() === 'yes' || row["Whatsapp followup done"]?.toLowerCase() === 'true').length;

  const conversionRate = totalSessionsPitched > 0 ? ((sessionsDoneCount / totalSessionsPitched) * 100).toFixed(1) : '0.0';
  const followRate = sessionsDoneCount > 0 ? ((followupsSentCount / sessionsDoneCount) * 100).toFixed(1) : '0.0';

  // --- SECTION 3: Performance by Physio Table ---
  const physioPerformance = useMemo(() => {
    const grouped = new Map<string, { pitched: number, done: number, whatsapp: number }>();
    
    filteredData.forEach(row => {
      const physio = row["Physio Name"]?.trim() || "Unknown";
      if (!grouped.has(physio)) {
        grouped.set(physio, { pitched: 0, done: 0, whatsapp: 0 });
      }
      const stats = grouped.get(physio)!;
      stats.pitched++;
      
      const isDone = row["Physio session Done"]?.toLowerCase() === 'yes' || row["Physio session Done"]?.toLowerCase() === 'true';
      const isWhatsapp = row["Whatsapp followup done"]?.toLowerCase() === 'yes' || row["Whatsapp followup done"]?.toLowerCase() === 'true';

      if (isDone) stats.done++;
      if (isWhatsapp) stats.whatsapp++;
    });

    return Array.from(grouped.entries()).map(([name, stats]) => {
      const convRate = stats.pitched > 0 ? ((stats.done / stats.pitched) * 100).toFixed(1) : '0.0';
      const fRate = stats.done > 0 ? ((stats.whatsapp / stats.done) * 100).toFixed(1) : '0.0';
      return {
        name,
        pitched: stats.pitched,
        done: stats.done,
        whatsappSent: stats.whatsapp,
        conversionRate: parseFloat(convRate),
        followRate: parseFloat(fRate)
      };
    }).sort((a, b) => b.done - a.done);
  }, [filteredData]);


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
                <SelectValue placeholder="All Active Months" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(m => (
                  <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-muted-foreground">Filter by Physio</label>
            <Select value={selectedPhysio} onValueChange={setSelectedPhysio}>
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
            <p className="text-muted-foreground animate-pulse">Loading verified clinical tracker data...</p>
          </div>
        ) : (
          <Tabs orientation='vertical' defaultValue='overview' className='space-y-6 pb-12'>
            <div className='w-full overflow-x-auto pb-2'>
              <TabsList>
                <TabsTrigger value='overview'>Overview</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value='overview' className='space-y-6'>
              
              {/* TOP CARDS */}
              <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                <Card>
                  <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                    <CardTitle className='text-sm font-medium'>Sessions Pitched</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='text-2xl font-bold'>{totalSessionsPitched}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                    <CardTitle className='text-sm font-medium'>Sessions Done</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='text-2xl font-bold text-green-500'>{sessionsDoneCount}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                    <CardTitle className='text-sm font-medium'>Conversion Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='text-2xl font-bold text-blue-500'>{conversionRate}%</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                    <CardTitle className='text-sm font-medium'>WhatsApp Follow-ups</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='text-2xl font-bold text-purple-500'>
                      {followupsSentCount} <span className="text-xs font-normal text-muted-foreground">({followRate}%)</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* SECTION 3: Performance by Physio Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance by Physio</CardTitle>
                  <CardDescription>Attended consultations and sent follow-ups</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Physio Name</TableHead>
                        <TableHead className="text-right">Total Sessions Pitched</TableHead>
                        <TableHead className="text-right">Sessions Attended</TableHead>
                        <TableHead className="text-right">Conversion Rate</TableHead>
                        <TableHead className="text-right">Follow-ups Sent</TableHead>
                        <TableHead className="text-right">Follow-up Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {physioPerformance.map((row) => (
                        <TableRow key={row.name}>
                          <TableCell className="font-medium">{row.name}</TableCell>
                          <TableCell className="text-right">{row.pitched}</TableCell>
                          <TableCell className="text-right text-green-500 font-semibold">{row.done}</TableCell>
                          <TableCell className="text-right font-semibold text-blue-500">{row.conversionRate}%</TableCell>
                          <TableCell className="text-right text-purple-400 font-medium">{row.whatsappSent}</TableCell>
                          <TableCell className="text-right">{row.followRate}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

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
