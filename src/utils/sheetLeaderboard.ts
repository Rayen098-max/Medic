import { supabase } from './db'

export interface PhysioTabConfig {
  name: string
  key: string
  tab: string
  role: string
}

export const PHYSIO_CONFIGS: PhysioTabConfig[] = [
  { name: 'Dr. Hritika Chavan', key: 'hritika', tab: 'Daily Tracker - Hritika', role: 'Physiotherapist' },
  { name: 'Dr. Dipti Mestry', key: 'dipti', tab: 'Daily Tracker - Dipti', role: 'Physiotherapist' },
  { name: 'Dr. Rutuja Tulaskar', key: 'rutuja', tab: 'Daily Tracker - Rutuja', role: 'Physiotherapist' },
  { name: 'Dr. Kritika Gawand', key: 'kritika', tab: 'Daily Tracker - Kritika', role: 'Physiotherapist' },
  { name: 'Dr. Aishwarya Panchal', key: 'aishwarya', tab: 'Daily Tracker - Aishwarya', role: 'Physiotherapist' },
  { name: 'Dr. Pooja Seema', key: 'pooja', tab: 'Daily Tracker - Pooja', role: 'Physiotherapist' },
  { name: 'Dr. Gursheen Kaur', key: 'gursheen', tab: 'Daily Tracker - Gursheen', role: 'Physiotherapist' },
  { name: 'Dr. Gaurav', key: 'gaurav', tab: 'Daily Tracker - Gaurav', role: 'Physiotherapist' },
]

export interface PhysioConsultationItem {
  id: string
  customerName: string
  customerPhone: string
  painPoint: string
  productSuggested: string
  isSent: boolean
}

export interface PhysioLeaderboardRow {
  id: string
  name: string
  designation: string
  attended: number
  followupsSent: number
  pendingFollowups: number
  ratePercentage: number
  rank: number
  diagnosesList: string[]
  consultations: PhysioConsultationItem[]
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

  // Query Supabase directly
  let rows: any[] = []
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('tracker_tasks')
        .select('*')
        .eq('consult_date', dateKey)

      if (error) {
        console.warn('Supabase query error for leaderboard:', error)
      } else if (Array.isArray(data)) {
        rows = data
      }
    } catch (err) {
      console.warn('Failed to query tracker_tasks for leaderboard:', err)
    }
  }

  // Aggregate stats per physio
  const physioMap = new Map<string, {
    config: PhysioTabConfig
    attended: number
    followupsSent: number
    diagnoses: Set<string>
    consultations: PhysioConsultationItem[]
  }>()

  PHYSIO_CONFIGS.forEach(cfg => {
    physioMap.set(cfg.key, {
      config: cfg,
      attended: 0,
      followupsSent: 0,
      diagnoses: new Set<string>(),
      consultations: []
    })
  })

  // Map of customer name on this date to avoid duplicate consultation double-counting
  const seenCustomerKeys = new Set<string>()

  rows.forEach(row => {
    const pName = String(row.physio_name || '').toLowerCase()
    const matched = PHYSIO_CONFIGS.find(cfg => pName.includes(cfg.key))
    if (!matched) return

    const isAttended = String(row.session_done || '').trim().toLowerCase() === 'yes'
    if (!isAttended) return

    const rawCustomerName = String(row.customer_name || '').trim()
    const cleanCustomerName = rawCustomerName.toLowerCase()
    const cleanPhone = String(row.customer_phone || '').replace(/\D/g, '')

    // Unique consultation key
    const consultKey = `${matched.key}_${cleanPhone || cleanCustomerName}_${dateKey}`
    if (seenCustomerKeys.has(consultKey)) return
    seenCustomerKeys.add(consultKey)

    const entry = physioMap.get(matched.key)!
    entry.attended++

    const isSent = Boolean(row.whatsapp_sent_at || row.patient_id)
    if (isSent) {
      entry.followupsSent++
    }

    const pain = (row.pain_point || '').trim()
    if (pain && pain.toLowerCase() !== 'none' && pain.toLowerCase() !== 'n/a') {
      entry.diagnoses.add(pain)
    }

    entry.consultations.push({
      id: row.id,
      customerName: rawCustomerName || 'Unknown Customer',
      customerPhone: row.customer_phone || 'N/A',
      painPoint: pain || 'General Posture Evaluation',
      productSuggested: row.product_suggested || '',
      isSent
    })
  })

  // Build ranked results
  const results: PhysioLeaderboardRow[] = Array.from(physioMap.values()).map(item => {
    const pendingFollowups = Math.max(0, item.attended - item.followupsSent)
    const ratePercentage = item.attended > 0 ? Math.round((item.followupsSent / item.attended) * 100) : 0
    const diagnosesList = Array.from(item.diagnoses)

    return {
      id: item.config.tab,
      name: item.config.name,
      designation: item.config.role,
      attended: item.attended,
      followupsSent: item.followupsSent,
      pendingFollowups,
      ratePercentage,
      rank: 0,
      diagnosesList,
      consultations: item.consultations
    }
  })

  // Sort by Rate % DESC, then Followups Sent DESC, then Customers Attended DESC, then Name ASC
  results.sort((a, b) => {
    if (b.ratePercentage !== a.ratePercentage) return b.ratePercentage - a.ratePercentage
    if (b.followupsSent !== a.followupsSent) return b.followupsSent - a.followupsSent
    if (b.attended !== a.attended) return b.attended - a.attended
    return a.name.localeCompare(b.name)
  })

  // Assign ranks
  const rankedLeaderboard = results.map((row, idx) => ({
    ...row,
    rank: idx + 1
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
