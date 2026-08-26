import { useEffect, useState } from 'react'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { getUsageReport } from '@/utils/db'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Clock, MousePointerClick, CalendarDays } from 'lucide-react'

export function UsageReport() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUsageReport()
      .then(res => {
        setData(res || [])
        setLoading(false)
      })
      .catch(err => {
        console.error("Error fetching usage report:", err)
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
            <h2 className='text-2xl font-bold tracking-tight'>Usage Report</h2>
            <p className='text-muted-foreground'>
              Track how often and how long customers view their personalized 3D recovery links.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-muted-foreground animate-pulse">Gathering tracking data...</p>
          </div>
        ) : (
          <div className="rounded-md border bg-card">
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
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No usage data recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row) => (
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
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Main>
    </>
  )
}
