import { supabase } from './db'
import Papa from 'papaparse'

export const SHEET_ID = '1tKa5y8t7PxuqBTMJSwJRDLI9SJX5X00aeSZ8fcQwmsU'

export interface PhysioTabConfig {
  name: string
  key: string
  tab: string
  gid?: string
  role: string
}

export const PHYSIO_CONFIGS: PhysioTabConfig[] = [
  { name: 'Dr. Hritika Chavan', key: 'hritika', tab: 'Daily Tracker - Hritika', gid: '1486502114', role: 'Physiotherapist' },
  { name: 'Dr. Dipti Mestry', key: 'dipti', tab: 'Daily Tracker - Dipti', gid: '1694551009', role: 'Physiotherapist' },
  { name: 'Dr. Rutuja Tulaskar', key: 'rutuja', tab: 'Daily Tracker - Rutuja', gid: '139271502', role: 'Physiotherapist' },
  { name: 'Dr. Kritika Gawand', key: 'kritika', tab: 'Daily Tracker - Kritika', gid: '1945751605', role: 'Physiotherapist' },
  { name: 'Dr. Aishwarya Panchal', key: 'aishwarya', tab: 'Daily Tracker - Aishwarya', gid: '592000750', role: 'Physiotherapist' },
  { name: 'Dr. Pooja Seema', key: 'pooja', tab: 'Daily Tracker - Pooja', gid: '785897241', role: 'Physiotherapist' },
  { name: 'Dr. Gursheen Kaur', key: 'gursheen', tab: 'Daily Tracker - Gursheen', gid: '1015773157', role: 'Physiotherapist' },
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

function parseSheetDateKey(dStr: string): string | null {
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

async function fetchGoogleSheetFallback(dateKey: string) {
  const tasks: any[] = []
  const promises = PHYSIO_CONFIGS.map(async (physio) => {
    try {
      const url = physio.gid
        ? `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${physio.gid}&_cb=${Date.now()}`
        : `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(physio.tab)}&_cb=${Date.now()}`
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) return

      const csvText = await res.text()
      const parsed = Papa.parse<any>(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
      })

      let lastDate = ''
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
          const sessionDone = (row['Physio session Done'] || row['Session Done'] || 'Yes').trim()
          tasks.push({
            id: `sheet_${physio.key}_${phone || name}`,
            physio_name: physio.name,
            customer_name: name,
            customer_phone: phone,
            consult_date: dateKey,
            session_done: sessionDone,
            pain_point: row['Concern / Painpoint'] || row['Concern'] || row['Painpoint'] || '',
            product_suggested: row['Product Suggested'] || '',
            patient_id: null,
            whatsapp_sent_at: null,
          })
        }
      }
    } catch (err) {
      console.warn(`Error fetching fallback sheet for ${physio.name}:`, err)
    }
  })

  await Promise.allSettled(promises)
  return tasks
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

  // UTC boundaries for the calendar day
  const startOfDay = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0)).toISOString()
  const endOfDay = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999)).toISOString()

  let rawTasks: any[] = []
  let allPatients: any[] = []
  let sessionsOnDate: any[] = []
  let profiles: any[] = []

  if (supabase) {
    try {
      const [tRes, pRes, sRes, profRes] = await Promise.allSettled([
        supabase.from('tracker_tasks').select('*').eq('consult_date', dateKey),
        supabase.from('patients').select('id, name, phone, physio_id, created_at, tracker_id, consultDate, painArea').is('deleted_at', null),
        supabase.from('patient_sessions').select('id, patient_id, created_at, duration_seconds').gte('created_at', startOfDay).lte('created_at', endOfDay),
        supabase.from('profiles').select('id, full_name, role'),
      ])

      if (tRes.status === 'fulfilled' && Array.isArray(tRes.value.data)) {
        rawTasks = tRes.value.data
      }
      if (pRes.status === 'fulfilled' && Array.isArray(pRes.value.data)) {
        allPatients = pRes.value.data
      }
      if (sRes.status === 'fulfilled' && Array.isArray(sRes.value.data)) {
        sessionsOnDate = sRes.value.data
      }
      if (profRes.status === 'fulfilled' && Array.isArray(profRes.value.data)) {
        profiles = profRes.value.data
      }
    } catch (err) {
      console.warn('Supabase query error in leaderboard:', err)
    }
  }

  // Fallback to Google Sheets if tracker_tasks had no rows for this date (e.g. unauthenticated or RLS)
  if (rawTasks.length === 0) {
    try {
      rawTasks = await fetchGoogleSheetFallback(dateKey)
    } catch (err) {
      console.warn('Fallback sheet fetch failed:', err)
    }
  }

  // Map profile.id to PHYSIO_CONFIGS key
  const profileToConfigKey = new Map<string, string>()
  profiles.forEach((p) => {
    const fName = String(p.full_name || '').toLowerCase()
    const matched = PHYSIO_CONFIGS.find((c) => fName.includes(c.key))
    if (matched) profileToConfigKey.set(p.id, matched.key)
  })

  // Patient lookup maps for fast, robust matching
  const patientById = new Map<string, any>()
  const patientByPhone = new Map<string, any>()
  const patientByName = new Map<string, any>()

  allPatients.forEach((p) => {
    patientById.set(p.id, p)
    if (p.phone) {
      const clean = String(p.phone).replace(/\D/g, '').slice(-10)
      if (clean.length >= 7) patientByPhone.set(clean, p)
    }
    if (p.name) {
      patientByName.set(String(p.name).trim().toLowerCase(), p)
    }
  })

  // Setup per-physio aggregation
  const physioMap = new Map<
    string,
    {
      config: PhysioTabConfig
      attended: number
      followupsSent: number
      diagnoses: Set<string>
      consultations: Map<string, PhysioConsultationItem>
    }
  >()

  PHYSIO_CONFIGS.forEach((cfg) => {
    physioMap.set(cfg.key, {
      config: cfg,
      attended: 0,
      followupsSent: 0,
      diagnoses: new Set<string>(),
      consultations: new Map<string, PhysioConsultationItem>(),
    })
  })

  // 1. Process attended consultations from tracker_tasks / sheet
  rawTasks.forEach((row) => {
    const pName = String(row.physio_name || '').toLowerCase()
    const matched = PHYSIO_CONFIGS.find((cfg) => pName.includes(cfg.key))
    if (!matched) return

    const isAttended = String(row.session_done || '').trim().toLowerCase() === 'yes'
    if (!isAttended) return

    const rawCustomerName = String(row.customer_name || '').trim()
    const cleanCustomerName = rawCustomerName.toLowerCase()
    const cleanPhone = String(row.customer_phone || '').replace(/\D/g, '').slice(-10)

    const consultKey = `${matched.key}_${cleanPhone || cleanCustomerName}`
    const entry = physioMap.get(matched.key)!

    // Match with patients table
    const matchedPatient =
      (cleanPhone && patientByPhone.get(cleanPhone)) ||
      patientByName.get(cleanCustomerName) ||
      (row.patient_id && patientById.get(row.patient_id))

    const isSent = Boolean(row.whatsapp_sent_at || row.patient_id || matchedPatient)

    const pain = (row.pain_point || '').trim()
    if (pain && pain.toLowerCase() !== 'none' && pain.toLowerCase() !== 'n/a') {
      entry.diagnoses.add(pain)
    }

    if (!entry.consultations.has(consultKey)) {
      entry.attended++
      if (isSent) entry.followupsSent++

      entry.consultations.set(consultKey, {
        id: row.id,
        customerName: rawCustomerName || matchedPatient?.name || 'Unknown Customer',
        customerPhone: row.customer_phone || matchedPatient?.phone || 'N/A',
        painPoint: pain || 'General Posture Evaluation',
        productSuggested: row.product_suggested || '',
        isSent,
      })
    } else {
      // Merge records: ensure sent status is NEVER overwritten by a duplicate null row
      const existing = entry.consultations.get(consultKey)!
      if (!existing.isSent && isSent) {
        existing.isSent = true
        entry.followupsSent++
      }
      if (pain && existing.painPoint === 'General Posture Evaluation') {
        existing.painPoint = pain
      }
      if (row.product_suggested && !existing.productSuggested) {
        existing.productSuggested = row.product_suggested
      }
    }
  })

  // 2. Cross-reference patient links opened on this date (e.g. Shraddha on Oct 13)
  sessionsOnDate.forEach((sess) => {
    const p = patientById.get(sess.patient_id)
    if (!p) return

    const physioKey = profileToConfigKey.get(p.physio_id) ||
      PHYSIO_CONFIGS.find((c) => String(p.physio_name || '').toLowerCase().includes(c.key))?.key
    if (!physioKey) return

    const entry = physioMap.get(physioKey)
    if (!entry) return

    const cleanPhone = String(p.phone || '').replace(/\D/g, '').slice(-10)
    const consultKey = `${physioKey}_${cleanPhone || String(p.name).toLowerCase()}`

    if (!entry.consultations.has(consultKey)) {
      entry.attended++
      entry.followupsSent++
      entry.consultations.set(consultKey, {
        id: `sess_${sess.id}`,
        customerName: p.name || 'Patient',
        customerPhone: p.phone || 'N/A',
        painPoint: p.painArea || 'Follow-up Portal Link Opened',
        productSuggested: 'Portal Active',
        isSent: true,
      })
    } else {
      const existing = entry.consultations.get(consultKey)!
      if (!existing.isSent) {
        existing.isSent = true
        entry.followupsSent++
      }
    }
  })

  // 3. Cross-reference patient cards created on this date
  const patientsCreatedOnDate = allPatients.filter(
    (p) => p.created_at >= startOfDay && p.created_at <= endOfDay
  )
  patientsCreatedOnDate.forEach((p) => {
    const physioKey = profileToConfigKey.get(p.physio_id) ||
      PHYSIO_CONFIGS.find((c) => String(p.physio_name || '').toLowerCase().includes(c.key))?.key
    if (!physioKey) return

    const entry = physioMap.get(physioKey)
    if (!entry) return

    const cleanPhone = String(p.phone || '').replace(/\D/g, '').slice(-10)
    const consultKey = `${physioKey}_${cleanPhone || String(p.name).toLowerCase()}`

    if (!entry.consultations.has(consultKey)) {
      entry.attended++
      entry.followupsSent++
      entry.consultations.set(consultKey, {
        id: `patient_${p.id}`,
        customerName: p.name || 'Patient',
        customerPhone: p.phone || 'N/A',
        painPoint: p.painArea || 'Personalized Recovery Card Generated',
        productSuggested: 'Care Plan Sent',
        isSent: true,
      })
    } else {
      const existing = entry.consultations.get(consultKey)!
      if (!existing.isSent) {
        existing.isSent = true
        entry.followupsSent++
      }
    }
  })

  // Build ranked results
  const results: PhysioLeaderboardRow[] = Array.from(physioMap.values()).map((item) => {
    const pendingFollowups = Math.max(0, item.attended - item.followupsSent)
    const ratePercentage = item.attended > 0 ? Math.min(100, Math.round((item.followupsSent / item.attended) * 100)) : 0
    const diagnosesList = Array.from(item.diagnoses)
    const consultations = Array.from(item.consultations.values())

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
      consultations,
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
    rank: idx + 1,
  }))

  const totalTeamAttended = results.reduce((acc, r) => acc + r.attended, 0)
  const totalTeamSent = results.reduce((acc, r) => acc + r.followupsSent, 0)
  const totalTeamPending = Math.max(0, totalTeamAttended - totalTeamSent)
  const overallRate = totalTeamAttended > 0 ? Math.min(100, Math.round((totalTeamSent / totalTeamAttended) * 100)) : 0

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
