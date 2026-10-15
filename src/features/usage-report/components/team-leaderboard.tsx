import { useState, useEffect, useRef } from 'react'
import { getLeaderboardReport } from '@/utils/db'
import html2canvas from 'html2canvas'
import {
  Trophy,
  Crown,
  Medal,
  Camera,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Share2,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface PhysioRank {
  id: string
  name: string
  designation: string
  rawScore: number
  qualifiedClicks: number
  totalSessions: number
  totalTime: number
  uniquePatients: number
  rank: number
}

interface LeaderboardData {
  targetDate: string
  displayDate: string
  isYesterday: boolean
  leaderboard: PhysioRank[]
  totalTeamSessions: number
  totalTeamQualifiedClicks: number
}

export function TeamLeaderboard() {
  // Default to Yesterday in YYYY-MM-DD
  const getYesterdayString = () => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }

  const [selectedDate, setSelectedDate] = useState<string>(getYesterdayString())
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [capturing, setCapturing] = useState<boolean>(false)
  const [copied, setCopied] = useState<boolean>(false)

  const leaderboardRef = useRef<HTMLDivElement>(null)

  const loadData = async (dateStr: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await getLeaderboardReport(dateStr)
      setData(res)
    } catch (err: any) {
      console.error('Error fetching leaderboard data:', err)
      setError(err.message || 'Failed to load leaderboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData(selectedDate)
  }, [selectedDate])

  const formatTime = (totalSeconds: number) => {
    if (!totalSeconds || totalSeconds < 60) return `${totalSeconds || 0}s`
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins}m ${secs}s`
  }

  const formatScore = (score: number) => {
    if (score === undefined || score === null) return '0'
    // 1 decimal place if fractional, integer if whole
    return Number.isInteger(score) ? score.toString() : score.toFixed(1)
  }

  const handlePrevDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number)
    const current = new Date(y, m - 1, d)
    current.setDate(current.getDate() - 1)
    const pad = (n: number) => String(n).padStart(2, '0')
    setSelectedDate(`${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}`)
  }

  const handleNextDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number)
    const current = new Date(y, m - 1, d)
    current.setDate(current.getDate() + 1)
    const pad = (n: number) => String(n).padStart(2, '0')
    setSelectedDate(`${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}`)
  }

  const handleResetYesterday = () => {
    setSelectedDate(getYesterdayString())
  }

  const handleDownloadImage = async () => {
    if (!leaderboardRef.current) return
    setCapturing(true)
    try {
      const canvas = await html2canvas(leaderboardRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
      })
      const image = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = image
      link.download = `medic_team_leaderboard_${selectedDate}.png`
      link.click()
    } catch (err) {
      console.error('Failed to capture screenshot:', err)
    } finally {
      setCapturing(false)
    }
  }

  const handleCopyImage = async () => {
    if (!leaderboardRef.current) return
    setCapturing(true)
    try {
      const canvas = await html2canvas(leaderboardRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
      })
      canvas.toBlob(async (blob) => {
        if (blob && navigator.clipboard && window.ClipboardItem) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ])
          setCopied(true)
          setTimeout(() => setCopied(false), 2500)
        }
      })
    } catch (err) {
      console.error('Failed to copy image to clipboard:', err)
    } finally {
      setCapturing(false)
    }
  }

  const top3 = data?.leaderboard.slice(0, 3) || []
  const restOfTeam = data?.leaderboard.slice(3) || []

  // Assign podium spots: Center = Rank 1, Left = Rank 2, Right = Rank 3
  const rank1 = top3.find(p => p.rank === 1) || top3[0]
  const rank2 = top3.find(p => p.rank === 2) || top3[1]
  const rank3 = top3.find(p => p.rank === 3) || top3[2]

  // Avatar helper with initials and consistent color
  const getInitials = (name: string) => {
    const cleaned = name.replace(/^Dr\.\s*/i, '').trim()
    const parts = cleaned.split(' ')
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return cleaned.slice(0, 2).toUpperCase()
  }

  const getAvatarGradient = (rank: number) => {
    if (rank === 1) return 'from-amber-400 to-yellow-600 text-amber-950'
    if (rank === 2) return 'from-slate-200 to-slate-400 text-slate-900'
    if (rank === 3) return 'from-amber-600 to-amber-800 text-amber-100'
    const colors = [
      'from-cyan-400 to-blue-600 text-white',
      'from-rose-400 to-pink-600 text-white',
      'from-emerald-400 to-teal-600 text-white',
      'from-violet-400 to-purple-600 text-white',
      'from-orange-400 to-red-600 text-white',
    ]
    return colors[rank % colors.length]
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Top Toolbar Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-card border rounded-xl shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 border rounded-lg bg-background p-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handlePrevDay}
              title="Previous Day"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2 px-2 text-sm font-medium">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none text-sm font-semibold focus:outline-hidden cursor-pointer"
              />
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleNextDay}
              title="Next Day"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant={data?.isYesterday ? 'secondary' : 'outline'}
            size="sm"
            onClick={handleResetYesterday}
            className="text-xs h-9"
          >
            Yesterday (Default)
          </Button>

          {data?.isYesterday && (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs py-1">
              Showing Yesterday's Activity
            </Badge>
          )}
        </div>

        {/* Screenshot / Export Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyImage}
            disabled={capturing || loading}
            className="text-xs h-9 gap-1.5"
            title="Copy screenshot to clipboard to paste directly into WhatsApp"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                Copied to Clipboard!
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5" />
                Copy Image
              </>
            )}
          </Button>

          <Button
            size="sm"
            onClick={handleDownloadImage}
            disabled={capturing || loading}
            className="text-xs h-9 gap-1.5 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-700 hover:to-indigo-700 text-white shadow-sm"
          >
            <Camera className="h-3.5 w-3.5" />
            {capturing ? 'Capturing...' : 'Download Image'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-72 items-center justify-center border rounded-2xl bg-card">
          <div className="flex flex-col items-center gap-3 text-muted-foreground animate-pulse">
            <Trophy className="h-8 w-8 text-amber-500/50" />
            <p className="text-sm font-medium">Calculating team qualified clicks for {selectedDate}...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex h-40 items-center justify-center border rounded-xl bg-red-500/10 text-red-500">
          Error: {error}
        </div>
      ) : (
        /* The Leaderboard Poster Card (Target of Screenshot & Visual Display) */
        <div
          ref={leaderboardRef}
          className="relative overflow-hidden rounded-3xl p-6 sm:p-10 shadow-2xl transition-all"
          style={{
            background: 'linear-gradient(135deg, #d82a87 0%, #7c31b8 42%, #4246df 100%)',
          }}
        >
          {/* Subtle Glassmorphic Overlay Background Accents */}
          <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-pink-400/20 blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 -right-24 w-80 h-80 rounded-full bg-indigo-300/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 left-1/3 w-80 h-80 rounded-full bg-purple-400/20 blur-3xl pointer-events-none" />

          {/* Header Title Section */}
          <div className="relative z-10 flex flex-col items-center text-center mb-8 sm:mb-12">
            <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-wider drop-shadow-md">
              TEAM LEADERBOARD
            </h1>
            <div className="flex items-center gap-2 mt-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-white/95 text-xs sm:text-sm font-medium shadow-inner">
              <Calendar className="w-3.5 h-3.5" />
              <span>{data?.displayDate}</span>
              <span className="text-white/60">•</span>
              <span className="text-pink-200 font-semibold">
                {data?.totalTeamQualifiedClicks || 0} Total Qualified Clicks
              </span>
            </div>
          </div>

          {/* Top 3 Podium Cards */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-end mb-8 sm:mb-12 max-w-5xl mx-auto">
            {/* Rank 2 (Left) */}
            <div className="order-2 md:order-1 flex flex-col">
              {rank2 ? (
                <div className="relative flex flex-col items-center text-center p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg hover:bg-white/15 transition-all">
                  {/* Badge */}
                  <div className="absolute -top-3.5 px-3 py-0.5 rounded-full bg-slate-200 text-slate-800 text-xs font-bold shadow-md flex items-center gap-1">
                    <Medal className="w-3.5 h-3.5" /> 2nd Place
                  </div>

                  {/* Avatar */}
                  <div className={`w-20 h-20 rounded-full bg-gradient-to-tr ${getAvatarGradient(2)} flex items-center justify-center font-bold text-xl shadow-lg border-2 border-white/40 my-3`}>
                    {getInitials(rank2.name)}
                  </div>

                  {/* Physio Info */}
                  <h3 className="text-lg font-bold text-white tracking-wide truncate max-w-[200px]" title={rank2.name}>
                    {rank2.name}
                  </h3>
                  <p className="text-xs text-white/70 font-medium mb-3">
                    {rank2.designation}
                  </p>

                  {/* Score */}
                  <div className="text-3xl font-black text-white tracking-tight drop-shadow-xs mb-1">
                    {formatScore(rank2.qualifiedClicks)}
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-pink-200">
                    Qualified Clicks
                  </span>

                  {/* Details */}
                  <div className="mt-4 pt-3 border-t border-white/15 w-full flex items-center justify-around text-xs text-white/80">
                    <div>
                      <span className="block font-bold text-white">{rank2.totalSessions}</span>
                      <span className="text-[10px] text-white/60">Sessions</span>
                    </div>
                    <div className="w-px h-5 bg-white/15" />
                    <div>
                      <span className="block font-bold text-white">{formatTime(rank2.totalTime)}</span>
                      <span className="text-[10px] text-white/60">Time</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center text-white/50 text-sm">
                  No Physio
                </div>
              )}
            </div>

            {/* Rank 1 (Center - Elevated & Highlighted) */}
            <div className="order-1 md:order-2 flex flex-col md:-translate-y-4">
              {rank1 ? (
                <div className="relative flex flex-col items-center text-center p-7 rounded-2xl bg-white/15 backdrop-blur-lg border-2 border-amber-300/50 shadow-2xl ring-4 ring-amber-400/20 hover:bg-white/20 transition-all">
                  {/* Crown Glow & Rank 1 Badge */}
                  <div className="absolute -top-5 px-4 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 text-xs font-black shadow-lg flex items-center gap-1.5 border border-yellow-200">
                    <Crown className="w-4 h-4 text-amber-900 fill-amber-900" /> 1st Champion
                  </div>

                  {/* Avatar */}
                  <div className={`w-24 h-24 rounded-full bg-gradient-to-tr ${getAvatarGradient(1)} flex items-center justify-center font-black text-2xl shadow-xl border-4 border-amber-300/70 my-3`}>
                    {getInitials(rank1.name)}
                  </div>

                  {/* Physio Info */}
                  <h3 className="text-xl font-black text-white tracking-wide truncate max-w-[220px]" title={rank1.name}>
                    {rank1.name}
                  </h3>
                  <p className="text-xs text-amber-200 font-semibold mb-3">
                    {rank1.designation}
                  </p>

                  {/* Score */}
                  <div className="text-4xl sm:text-5xl font-black text-white tracking-tight drop-shadow-md mb-1">
                    {formatScore(rank1.qualifiedClicks)}
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    Qualified Clicks
                  </span>

                  {/* Details */}
                  <div className="mt-4 pt-3 border-t border-white/20 w-full flex items-center justify-around text-xs text-white/90">
                    <div>
                      <span className="block font-bold text-white text-sm">{rank1.totalSessions}</span>
                      <span className="text-[10px] text-white/70">Sessions</span>
                    </div>
                    <div className="w-px h-5 bg-white/20" />
                    <div>
                      <span className="block font-bold text-white text-sm">{formatTime(rank1.totalTime)}</span>
                      <span className="text-[10px] text-white/70">Time</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-7 rounded-2xl bg-white/5 border border-white/10 text-center text-white/50 text-sm">
                  No Activity Recorded
                </div>
              )}
            </div>

            {/* Rank 3 (Right) */}
            <div className="order-3 flex flex-col">
              {rank3 ? (
                <div className="relative flex flex-col items-center text-center p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg hover:bg-white/15 transition-all">
                  {/* Badge */}
                  <div className="absolute -top-3.5 px-3 py-0.5 rounded-full bg-amber-700 text-amber-100 text-xs font-bold shadow-md flex items-center gap-1 border border-amber-500/40">
                    <Medal className="w-3.5 h-3.5" /> 3rd Place
                  </div>

                  {/* Avatar */}
                  <div className={`w-20 h-20 rounded-full bg-gradient-to-tr ${getAvatarGradient(3)} flex items-center justify-center font-bold text-xl shadow-lg border-2 border-white/40 my-3`}>
                    {getInitials(rank3.name)}
                  </div>

                  {/* Physio Info */}
                  <h3 className="text-lg font-bold text-white tracking-wide truncate max-w-[200px]" title={rank3.name}>
                    {rank3.name}
                  </h3>
                  <p className="text-xs text-white/70 font-medium mb-3">
                    {rank3.designation}
                  </p>

                  {/* Score */}
                  <div className="text-3xl font-black text-white tracking-tight drop-shadow-xs mb-1">
                    {formatScore(rank3.qualifiedClicks)}
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-pink-200">
                    Qualified Clicks
                  </span>

                  {/* Details */}
                  <div className="mt-4 pt-3 border-t border-white/15 w-full flex items-center justify-around text-xs text-white/80">
                    <div>
                      <span className="block font-bold text-white">{rank3.totalSessions}</span>
                      <span className="text-[10px] text-white/60">Sessions</span>
                    </div>
                    <div className="w-px h-5 bg-white/15" />
                    <div>
                      <span className="block font-bold text-white">{formatTime(rank3.totalTime)}</span>
                      <span className="text-[10px] text-white/60">Time</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center text-white/50 text-sm">
                  No Physio
                </div>
              )}
            </div>
          </div>

          {/* Table / Rows Section for Remaining Physios (Ranks 4+) */}
          <div className="relative z-10 max-w-5xl mx-auto">
            {restOfTeam.length > 0 && (
              <div className="space-y-3">
                {/* Table Header Row */}
                <div className="grid grid-cols-12 px-6 py-2 text-xs font-semibold uppercase tracking-wider text-white/70">
                  <div className="col-span-1 text-center">Rank</div>
                  <div className="col-span-5 sm:col-span-4">Physiotherapist</div>
                  <div className="col-span-3 sm:col-span-3 text-center">Qualified Clicks</div>
                  <div className="hidden sm:block sm:col-span-2 text-center">Sessions</div>
                  <div className="col-span-3 sm:col-span-2 text-right">Time Spent</div>
                </div>

                {/* Rows */}
                {restOfTeam.map((physio) => (
                  <div
                    key={physio.id}
                    className="grid grid-cols-12 items-center px-6 py-3.5 rounded-full bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/15 shadow-sm transition-all text-white"
                  >
                    {/* Rank Number */}
                    <div className="col-span-1 flex justify-center">
                      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-white/20 text-xs font-bold text-white/90">
                        {physio.rank}
                      </span>
                    </div>

                    {/* Avatar & Name */}
                    <div className="col-span-5 sm:col-span-4 flex items-center gap-3 min-w-0 pr-2">
                      <div className={`w-9 h-9 shrink-0 rounded-full bg-gradient-to-tr ${getAvatarGradient(physio.rank)} flex items-center justify-center text-xs font-bold border border-white/30 shadow-xs`}>
                        {getInitials(physio.name)}
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-sm truncate">{physio.name}</div>
                        <div className="text-[11px] text-white/60 font-medium truncate">{physio.designation}</div>
                      </div>
                    </div>

                    {/* Qualified Clicks */}
                    <div className="col-span-3 sm:col-span-3 text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 font-black text-sm text-white shadow-xs">
                        {formatScore(physio.qualifiedClicks)}
                      </span>
                    </div>

                    {/* Sessions */}
                    <div className="hidden sm:block sm:col-span-2 text-center text-sm font-medium text-white/80">
                      {physio.totalSessions} {physio.totalSessions === 1 ? 'session' : 'sessions'}
                    </div>

                    {/* Time Spent */}
                    <div className="col-span-3 sm:col-span-2 text-right font-mono text-xs sm:text-sm text-white/90 font-medium">
                      {formatTime(physio.totalTime)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state when 0 sessions across all physios */}
            {data?.totalTeamSessions === 0 && (
              <div className="mt-4 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center text-white/80 text-xs sm:text-sm">
                No customer portal sessions were recorded on {data?.displayDate}. The leaderboard above lists all team physiotherapists with 0 qualified clicks.
              </div>
            )}
          </div>

          {/* Footer Note */}
          <div className="relative z-10 text-center mt-8 pt-4 border-t border-white/15 text-[11px] text-white/60">
            Formula: Qualified Clicks = &sum; min(duration / 30s, 1.0) &bull; Maximum 1.0 credit per session &bull; Medic Clinical Platform
          </div>
        </div>
      )}
    </div>
  )
}
