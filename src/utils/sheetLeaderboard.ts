import Papa from 'papaparse'

export const SHEET_ID = '1tKa5y8t7PxuqBTMJSwJRDLI9SJX5X00aeSZ8fcQwmsU'

export interface PhysioTabConfig {
  name: string
  tab: string
  role: string
}

export const PHYSIO_CONFIGS: PhysioTabConfig[] = [
  { name: 'Dr. Hritika Chavan', tab: 'Daily Tracker - Hritika', role: 'Physiotherapist' },
  { name: 'Dr. Dipti Mestry', tab: 'Daily Tracker - Dipti', role: 'Physiotherapist' },
  { name: 'Dr. Rutuja Tulaskar', tab: 'Daily Tracker - Rutuja', role: 'Physiotherapist' },
  { name: 'Dr. Kritika Gawand', tab: 'Daily Tracker - Kritika', role: 'Physiotherapist' },
  { name: 'Dr. Aishwarya Panchal', tab: 'Daily Tracker - Aishwarya', role: 'Physiotherapist' },
  { name: 'Dr. Pooja Seema', tab: 'Daily Tracker - Pooja', role: 'Physiotherapist' },
  { name: 'Dr. Gursheen Kaur', tab: 'Daily Tracker - Gursheen', role: 'Physiotherapist' },
  { name: 'Dr. Gaurav', tab: 'Daily Tracker - Gaurav', role: 'Physiotherapist' },
]

export interface PhysioLeaderboardRow {
  id: string
  name: string
  designation: string
  attended: number
  followupsSent: number
  pendingFollowups: number
  ratePercentage: number
  rank: number
}

export interface SheetLeaderboardResult {
  targetDate: string
  displayDate: string
  isYesterday: boolean
  leaderboard: PhysioLeaderboardRow[]
  totalTeamAttended: number
  totalTeamSent: number
  totalTeamPending: number
  overallRate: number
}

export function parseSheetDateKey(dStr: string): string | null {
  if (!dStr) return null
  const cleaned = dStr.trim()
  const parts = cleaned.split(/[/\\]/)
  if (parts.length >= 2) {
    const val1 = parseInt(parts[0], 10)
    const val2 = parseInt(parts[1], 10)
    const val3 = parts.length >= 3 ? parseInt(parts[2], 10) : 2026
    const year = val3 < 100 ? 2000 + val3 : val3

    let day = val1
    let month = val2
    if (val1 > 12) {
      day = val1
      month = val2
    } else if (val2 > 12) {
      day = val2
      month = val1
    } else {
      // Default to day/month (standard in India)
      day = val1
      month = val2
    }
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${year}-${pad(month)}-${pad(day)}`
  }
  return null
}

export async function fetchSheetLeaderboard(targetDateStr?: string): Promise<SheetLeaderboardResult> {
  let targetDate: Date
  if (targetDateStr) {
    const [year, month, day] = targetDateStr.split('-').map(Number)
    targetDate = new Date(year, month - 1, day)
  } else {
    targetDate = new Date()
    targetDate.setDate(targetDate.getDate() - 1)
  }

  const pad = (n: number) => String(n).padStart(2, '0')
  const dateKey = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}`

  const fetchPromises = PHYSIO_CONFIGS.map(async (physio) => {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(physio.tab)}&_cb=${Date.now()}`
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) {
        return {
          id: physio.tab,
          name: physio.name,
          designation: physio.role,
          attended: 0,
          followupsSent: 0,
          pendingFollowups: 0,
          ratePercentage: 0,
        }
      }

      const csvText = await res.text()
      const parsed = Papa.parse<any>(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
      })

      let lastDate = ''
      let attended = 0
      let followupsSent = 0

      for (const row of parsed.data) {
        const rawDate = (row.Date || row.Dates || '').trim()
        if (rawDate && !['Start', 'Mid', 'End', 'cc', 'no cc', '..'].includes(rawDate)) {
          lastDate = rawDate
        }

        const name = (row['Customer Name'] || row['Name'] || '').trim()
        const phone = (row['Customer Number'] || row['Phone'] || '').trim()
        if (!name && !phone) continue

        const rowDateKey = parseSheetDateKey(lastDate)
        if (rowDateKey === dateKey) {
          attended++
          const followupVal = (row['Whatsapp followup done'] || '').trim().toLowerCase()
          if (['yes', 'done', 'true', 'y', 'sent'].includes(followupVal)) {
            followupsSent++
          }
        }
      }

      const pendingFollowups = Math.max(0, attended - followupsSent)
      const ratePercentage = attended > 0 ? Math.round((followupsSent / attended) * 100) : 0

      return {
        id: physio.tab,
        name: physio.name,
        designation: physio.role,
        attended,
        followupsSent,
        pendingFollowups,
        ratePercentage,
      }
    } catch (err) {
      console.error(`Error loading sheet for ${physio.name}:`, err)
      return {
        id: physio.tab,
        name: physio.name,
        designation: physio.role,
        attended: 0,
        followupsSent: 0,
        pendingFollowups: 0,
        ratePercentage: 0,
      }
    }
  })

  const results = await Promise.all(fetchPromises)

  // Rank by Followup Completion Rate % first, then Followups Sent, then Customers Attended
  results.sort((a, b) => {
    if (b.ratePercentage !== a.ratePercentage) return b.ratePercentage - a.ratePercentage
    if (b.followupsSent !== a.followupsSent) return b.followupsSent - a.followupsSent
    if (b.attended !== a.attended) return b.attended - a.attended
    return a.name.localeCompare(b.name)
  })

  const rankedLeaderboard: PhysioLeaderboardRow[] = results.map((row, idx) => ({
    ...row,
    rank: idx + 1,
  }))

  const totalTeamAttended = results.reduce((acc, r) => acc + r.attended, 0)
  const totalTeamSent = results.reduce((acc, r) => acc + r.followupsSent, 0)
  const totalTeamPending = totalTeamAttended - totalTeamSent
  const overallRate = totalTeamAttended > 0 ? Math.round((totalTeamSent / totalTeamAttended) * 100) : 0

  const isYesterday = (function () {
    const y = new Date()
    y.setDate(y.getDate() - 1)
    return y.toDateString() === targetDate.toDateString()
  })()

  return {
    targetDate: dateKey,
    displayDate: targetDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    isYesterday,
    leaderboard: rankedLeaderboard,
    totalTeamAttended,
    totalTeamSent,
    totalTeamPending,
    overallRate,
  }
}
