import { useEffect, useState, useMemo } from 'react'
import Papa from 'papaparse'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList
} from 'recharts'
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

// Types for the data from Google Sheets
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
  const [timeAgg, setTimeAgg] = useState<string>('daily') // 'daily' or 'weekly'

  useEffect(() => {
    const csvUrl = `https://docs.google.com/spreadsheets/d/1tKa5y8t7PxuqBTMJSwJRDLI9SJX5X00aeSZ8fcQwmsU/gviz/tq?tqx=out:csv&sheet=Master%20Data&_cb=${Date.now()}`;
    
    fetch(csvUrl, { cache: 'no-store' })
      .then(res => res.text())
      .then(csv => {
        const result = Papa.parse(csv, { header: true, skipEmptyLines: true });
        setData(result.data as TrackerRow[])
        setLoading(false)
      })
      .catch(err => {
        console.error("Error fetching data:", err)
        setLoading(false)
      })
  }, [])

  // Derived filter options
  const uniqueMonths = useMemo(() => {
    const months = new Set<string>()
    data.forEach(row => {
      const dateStr = row.Date ? row.Date.trim() : "Unknown Date"
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

  // Apply global filters
  const filteredData = useMemo(() => {
    return data.filter(row => {
      const matchMonth = selectedMonth === 'all' || (row.Date || 'Unknown Date') === selectedMonth
      const matchPhysio = selectedPhysio === 'all' || row["Physio Name"] === selectedPhysio
      return matchMonth && matchPhysio
    })
  }, [data, selectedMonth, selectedPhysio])

  // --- KPI Cards Calculations ---
  
  // Pitched count (reverting to total rows as per original logic since column is missing/empty)
  const totalSessionsPitched = filteredData.length;
  
  // Done count
  const doneRows = filteredData.filter(row => row["Physio session Done"]?.toLowerCase() === 'yes' || row["Physio session Done"]?.toLowerCase() === 'true');
  const sessionsDoneCount = doneRows.length;

  // Conversion rate (Done / Pitched)
  const conversionRate = totalSessionsPitched > 0 ? ((sessionsDoneCount / totalSessionsPitched) * 100).toFixed(2) : '0.00';

  // Repeat rate logic fix
  const normalizePhone = (num?: string) => {
    if (!num) return null;
    const cleaned = String(num).replace(/\D/g, '');
    return cleaned.slice(-10); 
  };
  
  const uniquePhones = new Set<string>();
  filteredData.forEach(row => {
    const p = normalizePhone(row["Customer Number"]);
    if (p) uniquePhones.add(p);
  });
  const repeatRate = totalSessionsPitched > 0 ? (((totalSessionsPitched - uniquePhones.size) / totalSessionsPitched) * 100).toFixed(2) : '0.00';


  // --- SECTION 3: Performance by Physio Table ---
  const physioPerformance = useMemo(() => {
    const grouped = new Map<string, { pitched: number, done: number, whatsapp: number }>();
    
    filteredData.forEach(row => {
      const physio = row["Physio Name"]?.trim() || "Unknown";
      if (!grouped.has(physio)) {
        grouped.set(physio, { pitched: 0, done: 0, whatsapp: 0 });
      }
      const stats = grouped.get(physio)!;
      
      // In the absence of Physio Pitched, each row counts as a pitch
      stats.pitched++;
      
      const isDone = row["Physio session Done"]?.toLowerCase() === 'yes';
      const isWhatsapp = row["Whatsapp followup done"]?.toLowerCase() === 'yes';

      if (isDone) stats.done++;
      if (isWhatsapp) stats.whatsapp++;
    });

    return Array.from(grouped.entries()).map(([name, stats]) => {
      const convRate = stats.pitched > 0 ? ((stats.done / stats.pitched) * 100).toFixed(1) : '0.0';
      const followRate = stats.done > 0 ? ((stats.whatsapp / stats.done) * 100).toFixed(1) : '0.0';
      return {
        name,
        pitched: stats.pitched,
        done: stats.done,
        conversionRate: parseFloat(convRate),
        followRate: parseFloat(followRate)
      };
    }).sort((a, b) => b.conversionRate - a.conversionRate); // Highest conversion first
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
            <p className="text-muted-foreground animate-pulse">Fetching live data from Google Sheets...</p>
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
                    <CardTitle className='text-sm font-medium'>Repeat Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='text-2xl font-bold text-purple-500'>{repeatRate}%</div>
                  </CardContent>
                </Card>
              </div>

              {/* SECTION 3: Performance by Physio Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance by Physio</CardTitle>
                  <CardDescription>Ranked by conversion rate</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Physio Name</TableHead>
                        <TableHead className="text-right">Total Sessions Pitched</TableHead>
                        <TableHead className="text-right">Total Sessions Done</TableHead>
                        <TableHead className="text-right">Conversion Rate</TableHead>
                        <TableHead className="text-right">WhatsApp Follow-up Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {physioPerformance.map((row) => (
                        <TableRow key={row.name}>
                          <TableCell className="font-medium">{row.name}</TableCell>
                          <TableCell className="text-right">{row.pitched}</TableCell>
                          <TableCell className="text-right">{row.done}</TableCell>
                          <TableCell className="text-right font-semibold text-blue-500">{row.conversionRate}%</TableCell>
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
