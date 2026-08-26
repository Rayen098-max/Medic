import { useEffect, useState, useMemo } from 'react'
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
  
  // Pitched count
  const pitchedRows = filteredData.filter(row => row["Physio Pitched"]?.toLowerCase() === 'yes' || row["Physio Pitched"]?.toLowerCase() === 'true');
  const totalSessionsPitched = pitchedRows.length;
  
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
  pitchedRows.forEach(row => {
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
      
      const isPitched = row["Physio Pitched"]?.toLowerCase() === 'yes';
      const isDone = row["Physio session Done"]?.toLowerCase() === 'yes';
      const isWhatsapp = row["Whatsapp followup done"]?.toLowerCase() === 'yes';

      if (isPitched) stats.pitched++;
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


  // --- SECTION 2: Why Sessions Don't Happen ---
  const declineReasonsData = useMemo(() => {
    const reasonsMap = new Map<string, number>();
    filteredData.forEach(row => {
      if (row["Physio session Done"]?.toLowerCase() === 'no') {
        const reason = (row["Reason (If Not done)"] || "Not specified").trim();
        if (reason) {
          reasonsMap.set(reason, (reasonsMap.get(reason) || 0) + 1);
        }
      }
    });
    return Array.from(reasonsMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredData]);


  // --- SECTION 4: Sessions Pitched Over Time ---
  const getWeekStart = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    d.setDate(d.getDate() - d.getDay()); // Sunday
    return d.toISOString().split('T')[0];
  }

  const timeSeriesData = useMemo(() => {
    const map = new Map<string, number>();
    pitchedRows.forEach(row => {
      const rawDate = row.Date?.trim();
      if (!rawDate) return;
      const key = timeAgg === 'weekly' ? getWeekStart(rawDate) : rawDate;
      map.set(key, (map.get(key) || 0) + 1);
    });
    
    return Array.from(map.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [pitchedRows, timeAgg]);


  // --- SECTION 1 & 5: Products/Concerns & Most Suggested Products ---
  const getFrequencyMap = (column: keyof TrackerRow) => {
    const map = new Map<string, number>();
    filteredData.forEach(row => {
      const val = row[column];
      if (val && typeof val === 'string' && val.trim() !== '') {
        const items = val.split(',').map(s => s.trim()).filter(Boolean);
        items.forEach(item => {
          map.set(item, (map.get(item) || 0) + 1);
        });
      }
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  };

  const primaryCategoryData = getFrequencyMap("Primary Category");
  const oldPainpointsData = getFrequencyMap("Customer Concern/Painpoint");
  const productsSuggestedData = getFrequencyMap("Product suggested");


  // --- SECTION 6: Data Completeness Indicator ---
  const totalRows = filteredData.length;
  const painpointFilledCount = filteredData.filter(row => row["Customer Concern/Painpoint"]?.trim()).length;
  const completenessPercent = totalRows > 0 ? ((painpointFilledCount / totalRows) * 100).toFixed(1) : '0';


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

              {/* SECTION 2: Why Sessions Don't Happen */}
              <Card>
                <CardHeader>
                  <CardTitle>Why Sessions Don't Happen</CardTitle>
                  <CardDescription>Decline reasons for sessions pitched but not completed</CardDescription>
                </CardHeader>
                <CardContent>
                  {declineReasonsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart layout="vertical" data={declineReasonsData} margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                        <Bar dataKey="count" fill="#F87171" radius={[0, 4, 4, 0]}>
                          <LabelList dataKey="count" position="right" fontSize={12} fill="var(--foreground)" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted-foreground text-sm text-center py-8">No decline data available for the current filters.</p>
                  )}
                </CardContent>
              </Card>

              {/* SECTION 4: Sessions Pitched Over Time */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Sessions Pitched Over Time</CardTitle>
                    <CardDescription>Volume of pitches</CardDescription>
                  </div>
                  <Select value={timeAgg} onValueChange={setTimeAgg}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </CardHeader>
                <CardContent>
                  {timeSeriesData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={timeSeriesData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                        <Line type="monotone" dataKey="count" stroke="#00d2ff" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted-foreground text-sm text-center py-8">No time series data available.</p>
                  )}
                </CardContent>
              </Card>

              {/* SECTION 1 & 5: Products/Concerns & Most Suggested Products side by side */}
              <div className='grid gap-4 md:grid-cols-2'>
                <Card>
                  <CardHeader>
                    <CardTitle>Products/Concerns Discussed</CardTitle>
                    <CardDescription>From 'Primary Category'</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {primaryCategoryData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart layout="vertical" data={primaryCategoryData} margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" hide />
                          <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
                          <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                          <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                            <LabelList dataKey="count" position="right" fontSize={12} fill="var(--foreground)" />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-muted-foreground text-sm text-center py-8">No primary category data available.</p>
                    )}
                    
                    {/* Secondary sparse data */}
                    {oldPainpointsData.length > 0 && (
                      <div className="mt-8 border-t pt-4">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Legacy Painpoints (Sparse)</h4>
                        <ResponsiveContainer width="100%" height={150}>
                          <BarChart layout="vertical" data={oldPainpointsData} margin={{ top: 0, right: 30, left: 100, bottom: 0 }}>
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} />
                            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                            <Bar dataKey="count" fill="#94a3b8" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Most Suggested Products</CardTitle>
                    <CardDescription>What physios are actively recommending</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {productsSuggestedData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart layout="vertical" data={productsSuggestedData} margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" hide />
                          <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
                          <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                          <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]}>
                            <LabelList dataKey="count" position="right" fontSize={12} fill="var(--foreground)" />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-muted-foreground text-sm text-center py-8">No suggested product data available.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              {/* SECTION 6: Data Completeness Indicator */}
              <div className="flex justify-center mt-8">
                <span className="inline-flex items-center rounded-full bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-muted-foreground/20">
                  Data Quality: Legacy 'Pain point' logged for {completenessPercent}% of entries.
                </span>
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
