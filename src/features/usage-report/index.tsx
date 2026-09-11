import { useEffect, useState, useMemo } from 'react'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { getUsageReport, getFollowupsReport } from '@/utils/db'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Clock, MousePointerClick, CalendarDays, User, MessageCircle } from 'lucide-react'

export function UsageReport() {
  const [viewMode, setViewMode] = useState('opens') // 'opens' or 'followups'
  const [data, setData] = useState([])
  const [followupsData, setFollowupsData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filters for Followups
  const [selectedPhysio, setSelectedPhysio] = useState('all')
  const [dateRange, setDateRange] = useState('all') // 'all', '7d', '30d'

  useEffect(() => {
    setLoading(true)
    Promise.all([getUsageReport(), getFollowupsReport()])
      .then(([usageRes, followupsRes]) => {
        setData(usageRes || [])
        setFollowupsData(followupsRes || [])
        setLoading(false)
      })
      .catch(err => {
        console.error("Error fetching reports:", err)
        setError(err.message || "Failed to load reports")
        setLoading(false)
      })
  }, [])

  const formatTime = (totalSeconds) => {
    if (totalSeconds < 60) return `${totalSeconds}s`
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins}m ${secs}s`
  }

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A'
    const date = new Date(isoString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const uniquePhysios = useMemo(() => {
    const physios = new Set(followupsData.map(f => f.physioName))
    return Array.from(physios).sort()
  }, [followupsData])

  const filteredFollowups = useMemo(() => {
    return followupsData.filter(f => {
      if (selectedPhysio !== 'all' && f.physioName !== selectedPhysio) return false
      
      if (dateRange !== 'all') {
        const date = new Date(f.dateSent)
        const now = new Date()
        const diffTime = Math.abs(now - date)
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        if (dateRange === '7d' && diffDays > 7) return false
        if (dateRange === '30d' && diffDays > 30) return false
      }
      
      return true
    })
  }, [followupsData, selectedPhysio, dateRange])

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-4'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Usage Report</h2>
            <p className='text-muted-foreground'>
              {viewMode === 'opens' 
                ? 'Track how often and how long customers view their personalized 3D recovery links.'
                : 'Monitor WhatsApp follow-ups sent by physiotherapists to patients.'}
            </p>
          </div>
          <div className='w-48'>
            <Select value={viewMode} onValueChange={setViewMode}>
              <SelectTrigger>
                <SelectValue placeholder="Select view" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="opens">Link Opens Tracking</SelectItem>
                <SelectItem value="followups">Followups Track</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {viewMode === 'followups' && (
          <div className='flex flex-wrap gap-4 mb-2 animate-in fade-in slide-in-from-top-2'>
            <div className='w-[200px]'>
              <label className='text-xs text-muted-foreground mb-1 block'>Filter by Physio</label>
              <Select value={selectedPhysio} onValueChange={setSelectedPhysio}>
                <SelectTrigger>
                  <SelectValue placeholder="All Physios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Physios</SelectItem>
                  {uniquePhysios.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='w-[200px]'>
              <label className='text-xs text-muted-foreground mb-1 block'>Date Range</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-muted-foreground animate-pulse">Gathering tracking data...</p>
          </div>
        ) : error ? (
           <div className="flex h-40 items-center justify-center border rounded-lg bg-red-500/10 text-red-500">
            Error: {error}
          </div>
        ) : viewMode === 'opens' ? (
          data.length === 0 ? (
            <div className="flex h-40 items-center justify-center border rounded-lg bg-card text-muted-foreground">
              No usage data recorded yet.
            </div>
          ) : (
            <div className="rounded-md border bg-card animate-in fade-in slide-in-from-bottom-4 duration-300">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Customer Number</TableHead>
                    <TableHead>Attending Physio</TableHead>
                    <TableHead className="w-[150px]">
                      <div className="flex items-center gap-1.5">
                        <MousePointerClick className="w-4 h-4" />
                        Total Opens
                      </div>
                    </TableHead>
                    <TableHead className="w-[180px]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        Total Time Spent
                      </div>
                    </TableHead>
                    <TableHead className="w-[200px]">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="w-4 h-4" />
                        Last Opened
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>{row.phone}</TableCell>
                      <TableCell>{row.physioName}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-xs font-semibold">
                          {row.totalOpens} {row.totalOpens === 1 ? 'time' : 'times'}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatTime(row.totalTime)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(row.lastOpened)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        ) : (
          filteredFollowups.length === 0 ? (
            <div className="flex h-40 items-center justify-center border rounded-lg bg-card text-muted-foreground">
              No follow-ups recorded yet.
            </div>
          ) : (
            <div className="rounded-md border bg-card animate-in fade-in slide-in-from-bottom-4 duration-300">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="w-4 h-4" />
                        Date Sent
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1.5">
                        <User className="w-4 h-4" />
                        Physio Name
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1.5">
                        <User className="w-4 h-4" />
                        Patient Name
                      </div>
                    </TableHead>
                    <TableHead className="w-[150px]">Method</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFollowups.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        {formatDate(row.dateSent)}
                      </TableCell>
                      <TableCell>{row.physioName}</TableCell>
                      <TableCell>{row.patientName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                          <MessageCircle className="w-4 h-4" />
                          <span>WhatsApp</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        )}
      </Main>
    </>
  )
}
