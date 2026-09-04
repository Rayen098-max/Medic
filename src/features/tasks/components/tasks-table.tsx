import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageCircle, Eye, Trash2 } from 'lucide-react'
import CaptureForm from '@/components/CaptureForm'
import { getPatients } from '@/utils/db'
import { useAuth } from '@/context/AuthContext'

interface TrackerRow {
  Date: string;
  "Physio Name": string;
  "Customer Name": string;
  "Customer Number": string;
  "Physio session Done": string;
}

interface TasksTableProps {
  data: TrackerRow[]
}

const getTaskId = (row: TrackerRow) => `${row.Date || ''}-${row["Customer Name"] || ''}-${row["Customer Number"] || ''}`

export function TasksTable({ data }: TasksTableProps) {
  const { profile } = useAuth()
  const [expandedRowIdx, setExpandedRowIdx] = useState<string | null>(null)
  const [filledForms, setFilledForms] = useState<Set<string>>(new Set())
  const [filledPatientIds, setFilledPatientIds] = useState<Record<string, string>>({})
  const [dbPatients, setDbPatients] = useState<any[]>([])
  
  // Track deleted tasks in localStorage
  const [deletedTasks, setDeletedTasks] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('deleted_tasks')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch (e) {
      console.error("Error parsing deleted_tasks from localStorage", e)
      return new Set()
    }
  })

  useEffect(() => {
    getPatients()
      .then(res => {
        if (res) setDbPatients(res)
      })
      .catch(err => console.error("Error fetching db patients:", err))
  }, [])

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to remove this task?")) {
      setDeletedTasks(prev => {
        const next = new Set(prev)
        next.add(id)
        localStorage.setItem('deleted_tasks', JSON.stringify(Array.from(next)))
        return next
      })
      if (expandedRowIdx === id) setExpandedRowIdx(null)
    }
  }

  const handleFillFormClick = (id: string) => {
    if (expandedRowIdx === id) {
      setExpandedRowIdx(null)
    } else {
      setExpandedRowIdx(id)
    }
  }

  const handleDone = (id: string, newId?: string) => {
    setFilledForms(prev => new Set(prev).add(id))
    if (newId) {
      setFilledPatientIds(prev => ({ ...prev, [id]: newId }))
    }
    setExpandedRowIdx(null)
  }

  const getMatchedPatientId = useCallback((row: TrackerRow, id: string) => {
    // 0. Strong link via database (works across devices)
    const dbLinked = dbPatients.find(p => p.tracker_id === id);
    if (dbLinked) return dbLinked.id;

    // 1. Check explicitly linked patient IDs (from local storage / manual linking)
    if (filledPatientIds[id]) return filledPatientIds[id];
    const cleanPhone = String(row["Customer Number"] || "").replace(/\D/g, '');
    const cleanName = String(row["Customer Name"] || "").trim().toLowerCase();
    
    const found = dbPatients.find(p => {
      const pPhone = String(p.phone || "").replace(/\D/g, '');
      const pName = String(p.name || "").trim().toLowerCase();
      return (cleanPhone.length >= 7 && pPhone.length >= 7 && (pPhone.includes(cleanPhone) || cleanPhone.includes(pPhone))) ||
             (cleanName && pName && (cleanName === pName));
    });

    return found ? found.id : null;
  }, [dbPatients, filledPatientIds]);

  const handlePreview = (row: TrackerRow, id: string) => {
    const patientId = getMatchedPatientId(row, id);
    if (patientId) {
      window.open(`/r/${patientId}`, '_blank');
    } else {
      window.open(`/map`, '_blank');
    }
  }

  const handleWhatsApp = (row: TrackerRow, id: string, appType: 'default' | 'business' | 'web' = 'default') => {
    let phone = String(row["Customer Number"] || "").replace(/\D/g, '');
    if (!phone) {
      alert("No phone number available for this customer.");
      return;
    }
    if (phone.length === 10) {
      phone = '91' + phone;
    }

    const patientId = getMatchedPatientId(row, id);
    const cacheBuster = new Date().getTime();
    const link = patientId 
      ? `${window.location.origin}/r/${patientId}?v=${cacheBuster}` 
      : `${window.location.origin}/map`;

    const patient = dbPatients.find(p => p.id === patientId);
    const customMessage = patient?.conditionNotes?.whatsappMessage;

    const customerName = row["Customer Name"] || "there";
    const physioName = profile?.full_name?.replace(/^Dr\.?\s+/i, '') || 'Physio';

    const defaultGreeting = `Hi ${customerName},\n\nHope your body is treating you better! Let me know if you have any questions.`;
    const greeting = (customMessage && customMessage.trim().length > 0) ? customMessage : defaultGreeting;

    const fullMessage = `${greeting}\n\nYour Personalized Plan for ${customerName}:\n👉 ${link}\n\nBest regards,\nDr. ${physioName}`;

    const encoded = encodeURIComponent(fullMessage);
    
    let url = `https://wa.me/${phone}?text=${encoded}`;
    if (appType === 'business') {
      url = `intent://send/?phone=${phone}&text=${encoded}#Intent;scheme=whatsapp;package=com.whatsapp.w4b;end`;
    } else if (appType === 'web') {
      url = `https://web.whatsapp.com/send?phone=${phone}&text=${encoded}`;
    }

    window.open(url, '_blank');
  }

  // Filter out deleted tasks
  const activeData = useMemo(() => {
    return data.filter(row => !deletedTasks.has(getTaskId(row)))
  }, [data, deletedTasks])

  // Partition into pending and completed
  const { pendingTasks, completedTasks } = useMemo(() => {
    const pending: Array<{ row: TrackerRow, id: string, patientId: string | null }> = []
    const completed: Array<{ row: TrackerRow, id: string, patientId: string | null }> = []
    const matchedPatientIds = new Set<string>()

    activeData.forEach(row => {
      const id = getTaskId(row)
      const patientId = getMatchedPatientId(row, id)
      const isFilled = Boolean(patientId) || filledForms.has(id)
      
      if (patientId) {
        matchedPatientIds.add(patientId)
      }

      if (isFilled) {
        completed.push({ row, id, patientId })
      } else {
        pending.push({ row, id, patientId })
      }
    })

    // Add manually created forms (patients in db not matched to any Google Sheet row)
    dbPatients.forEach(p => {
      if (!matchedPatientIds.has(p.id)) {
        const fakeRow: TrackerRow = {
          "Date": p.consultDate ? new Date(p.consultDate).toLocaleDateString() : new Date(p.created_at).toLocaleDateString(),
          "Customer Name": p.name || 'Unknown',
          "Customer Number": p.phone || 'N/A',
        }
        completed.push({ row: fakeRow, id: p.tracker_id || p.id, patientId: p.id })
      }
    })

    return { pendingTasks: pending, completedTasks: completed }
  }, [activeData, filledForms, filledPatientIds, dbPatients])


  const renderTable = (
    title: string, 
    tasks: Array<{ row: TrackerRow, id: string, patientId: string | null }>, 
    emptyMessage: string
  ) => {
    return (
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-3">{title}</h3>
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer Name</TableHead>
                <TableHead>Customer Number</TableHead>
                <TableHead className="w-[140px]">Actions</TableHead>
                <TableHead className="w-[120px]">Preview</TableHead>
                <TableHead className="w-[180px]">Contact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                tasks.map(({ row, id, patientId }) => {
                  const isExpanded = expandedRowIdx === id;
                  const isFilled = Boolean(patientId) || filledForms.has(id);

                  return (
                    <React.Fragment key={id}>
                      <TableRow>
                        <TableCell className="font-medium">{row["Customer Name"] || 'Unknown'}</TableCell>
                        <TableCell>{row["Customer Number"] || 'N/A'}</TableCell>
                        <TableCell>
                          {isFilled ? (
                            <Button 
                              variant="default" 
                              onClick={() => handleFillFormClick(id)}
                              className="bg-green-600 hover:bg-green-700 text-white w-full text-xs"
                            >
                              {isExpanded ? 'Cancel' : 'Form Filled'}
                            </Button>
                          ) : (
                            <Button 
                              variant="destructive" 
                              onClick={() => handleFillFormClick(id)}
                              className="w-full text-xs"
                            >
                              {isExpanded ? 'Cancel' : 'Fill Form'}
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="secondary"
                            className="w-full gap-1.5 text-xs"
                            onClick={() => handlePreview(row, id)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Preview
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 w-full">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="outline"
                                  className="flex-1 gap-1.5 border-green-600 text-green-600 hover:bg-green-50 text-xs px-2"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                  WhatsApp
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleWhatsApp(row, id, 'default')}>
                                  WhatsApp (Default)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleWhatsApp(row, id, 'business')}>
                                  WhatsApp Business (Android)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleWhatsApp(row, id, 'web')}>
                                  WhatsApp Web
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <Button
                              variant="outline"
                              className="border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 hover:border-red-300 px-2.5"
                              onClick={() => handleDelete(id)}
                              title="Remove Task"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={5} className="p-0 border-b-0">
                            <div className="p-4 bg-muted/30">
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg">
                                    {isFilled ? 'Update Consult Details' : 'New Consult Form'}
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0 sm:p-6">
                                  <CaptureForm 
                                    isEmbedded={true}
                                    initialData={{
                                      name: row["Customer Name"],
                                      phone: row["Customer Number"] ? String(row["Customer Number"]) : "",
                                      consultDate: row["Date"],
                                      tracker_id: id
                                    }}
                                    onSuccess={(newId?: string) => handleDone(id, newId)}
                                  />
                                </CardContent>
                              </Card>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="rounded-md border bg-card flex items-center justify-center h-32 text-muted-foreground">
        No tasks available for this date.
      </div>
    )
  }

  return (
    <div>
      {renderTable(
        "Pending Follow-ups", 
        pendingTasks, 
        "All caught up! No pending follow-ups."
      )}
      
      {renderTable(
        "Completed Follow-ups", 
        completedTasks, 
        "No completed follow-ups yet."
      )}
    </div>
  )
}
