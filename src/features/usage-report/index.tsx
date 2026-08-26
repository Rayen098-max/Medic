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
import { Button } from '@/components/ui/button'
import { Clock, MousePointerClick, CalendarDays, ArrowLeft, UserSquare2, Users } from 'lucide-react'

export function UsageReport() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPhysio, setSelectedPhysio] = useState(null)

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

  // Group data by physio
  const physioGroups = data.reduce((acc, row) => {
    if (!acc[row.physioName]) {
      acc[row.physioName] = {
        name: row.physioName,
        count: 0,
        patients: []
      }
    }
    acc[row.physioName].count += 1
    acc[row.physioName].patients.push(row.name)
    return acc
  }, {})

  const physioCards = Object.values(physioGroups).sort((a, b) => b.count - a.count)
  const filteredData = selectedPhysio ? data.filter(r => r.physioName === selectedPhysio) : []

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
              {selectedPhysio 
                ? `Detailed usage stats for ${selectedPhysio}'s patients.`
                : 'Track how often and how long customers view their personalized 3D recovery links.'}
            </p>
          </div>
          {selectedPhysio && (
            <Button variant="outline" onClick={() => setSelectedPhysio(null)} className="gap-2">
              <ArrowLeft size={16} /> Back to Overview
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-muted-foreground animate-pulse">Gathering tracking data...</p>
          </div>
        ) : !selectedPhysio ? (
          // CARD GRID VIEW
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {physioCards.length === 0 ? (
              <div className="col-span-full h-32 flex items-center justify-center border rounded-lg bg-card text-muted-foreground">
                No usage data recorded yet.
              </div>
            ) : (
              physioCards.map((physio, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setSelectedPhysio(physio.name)}
                  className="group relative flex flex-col rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md hover:border-primary/50 cursor-pointer overflow-hidden"
                >
                  <div className="p-6 pb-4 flex items-start justify-between border-b border-muted/20 bg-muted/10">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <UserSquare2 className="text-primary/70" size={20} />
                        {physio.name}
                      </h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Users size={14} /> Follow-ups Sent
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xl ring-4 ring-primary/5">
                      {physio.count}
                    </div>
                  </div>
                  <div className="p-0 flex-1">
                    <div className="h-40 overflow-y-auto p-4 custom-scrollbar">
                      <ul className="space-y-2.5">
                        {physio.patients.map((pName, pIdx) => (
                          <li key={pIdx} className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-foreground/90 transition-colors">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary/40"></div>
                            {pName}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="bg-primary/5 p-3 text-center text-xs font-medium text-primary uppercase tracking-wider group-hover:bg-primary/10 transition-colors">
                    Click to view detailed stats
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          // DETAILED TABLE VIEW
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
                {filteredData.map((row) => (
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
        )}
      </Main>
    </>
  )
}
