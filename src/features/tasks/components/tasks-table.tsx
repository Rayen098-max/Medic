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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageCircle, Eye, Trash2, Sparkles, Check, FileText } from 'lucide-react'
import CaptureForm from '@/components/CaptureForm'
import { getPatients, recordFollowup, softDeleteTrackerTask, markTaskWhatsAppSent, updatePatientStatus } from '@/utils/db'
import { useAuth } from '@/context/AuthContext'
import { createMattressShareToken } from '@/features/mattress/shareToken'

import { ConfirmDialog } from '@/components/confirm-dialog'

interface TrackerRow {
  id?: string;
  Date: string;
  "Physio Name": string;
  "Customer Name": string;
  "Customer Number": string;
  "Physio session Done": string;
  patient_id?: string | null;
  whatsapp_sent_at?: string | null;
  Comments?: string;
  comments?: string;
  "Customer Concern/Painpoint"?: string;
  pain_point?: string;
  "Product suggested"?: string;
  product_suggested?: string;
  "Exercise and changes in lifestyle"?: string;
  "Advice Given "?: string;
  "Whatsapp followup done"?: string;
}

interface TasksTableProps {
  data: TrackerRow[]
}

const getTaskId = (row: TrackerRow) => row.id || `${row.Date || ''}-${row["Customer Name"] || ''}-${row["Customer Number"] || ''}`

export function TasksTable({ data }: TasksTableProps) {
  const { profile } = useAuth()
  const [expandedRowIdx, setExpandedRowIdx] = useState<string | null>(null)
  const [filledForms, setFilledForms] = useState<Set<string>>(new Set())
  const [filledPatientIds, setFilledPatientIds] = useState<Record<string, string>>({})
  const [dbPatients, setDbPatients] = useState<any[]>([])
  const [taskToDelete, setTaskToDelete] = useState<{ id: string; name: string } | null>(null)
  
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

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    const { id } = taskToDelete;
    await softDeleteTrackerTask(id);
    setDeletedTasks(prev => {
      const next = new Set(prev)
      next.add(id)
      localStorage.setItem('deleted_tasks', JSON.stringify(Array.from(next)))
      return next
    });
    if (expandedRowIdx === id) setExpandedRowIdx(null);
    setTaskToDelete(null);
  };

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
    // 0. Direct link from Supabase tracker_tasks
    if (row.patient_id) return row.patient_id;

    // 1. Strong link via database patients table tracker_id (works across devices)
    const dbLinked = dbPatients.find(p => p.tracker_id === id);
    if (dbLinked) return dbLinked.id;

    // 2. Check explicitly linked patient IDs (from local session)
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
      window.open(`/r/demo`, '_blank');
    }
  }

  const getCustomerCustomMessage = (patient?: any, row?: TrackerRow) => {
    if (patient?.conditionNotes?.whatsappMessage?.trim()) {
      return patient.conditionNotes.whatsappMessage.trim();
    }
    if (patient?.conditionNotes && typeof patient.conditionNotes === 'object') {
      const vals = Object.values(patient.conditionNotes).filter(v => typeof v === 'string' && v.trim().length > 0) as string[];
      if (vals.length > 0) return vals[0].trim();
    }
    if (row?.Comments?.trim()) return row.Comments.trim();
    if (row?.comments?.trim()) return row.comments.trim();
    if (row?.["Advice Given "]?.trim()) return row["Advice Given "].trim();
    if (row?.["Exercise and changes in lifestyle"]?.trim()) return row["Exercise and changes in lifestyle"].trim();
    return '';
  };

  const getPersonalizedMessage = (row: TrackerRow, id: string) => {
    const patientId = getMatchedPatientId(row, id);
    const patient = dbPatients.find(p => p.id === patientId);
    const customMessage = getCustomerCustomMessage(patient, row);
    const customerName = row["Customer Name"] || "there";
    const physioName = profile?.full_name?.replace(/^Dr\.?\s+/i, '') || 'Physio';
    const link = patientId 
      ? `${window.location.origin}/r/${patientId}` 
      : `${window.location.origin}/r/demo`;

    const defaultGreeting = `Hi ${customerName},\n\nHope your body is treating you better! Let me know if you have any questions.`;
    const greeting = customMessage || defaultGreeting;

    return `${greeting}\n\nYour Personalized Plan for ${customerName}:\n👉 ${link}\n\nBest regards,\nDr. ${physioName} (PT)`;
  };

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
    const customerName = row["Customer Name"] || "there";
    const fullMessage = getPersonalizedMessage(row, id);
    const encoded = encodeURIComponent(fullMessage);
    
    let url = `https://wa.me/${phone}?text=${encoded}`;
    if (appType === 'business') {
      url = `intent://send/?phone=${phone}&text=${encoded}#Intent;scheme=whatsapp;package=com.whatsapp.w4b;end`;
    } else if (appType === 'web') {
      url = `https://web.whatsapp.com/send?phone=${phone}&text=${encoded}`;
    }

    const now = new Date().toISOString();
    if (profile?.id) {
      recordFollowup(patientId, profile.id, customerName);
    }
    markTaskWhatsAppSent(id, { phone: row["Customer Number"], date: row["Date"], name: row["Customer Name"] });
    if (patientId) {
      updatePatientStatus(patientId, { followup_sent_at: now });
    }
    row.whatsapp_sent_at = now;

    window.open(url, '_blank');
  }

  const handleSleepScienceWhatsApp = async (row: TrackerRow, id: string, appType: 'default' | 'business' | 'web' = 'default') => {
    let phone = String(row["Customer Number"] || "").replace(/\D/g, '');
    if (!phone) {
      alert("No phone number available for this customer.");
      return;
    }
    if (phone.length === 10) {
      phone = '91' + phone;
    }

    const patientId = getMatchedPatientId(row, id);
    // Customer-facing links carry only an opaque, expiring share token. If the
    // token migration is not deployed yet, fall back to the generic lab URL.
    const shareToken = patientId ? await createMattressShareToken(patientId) : null;
    const sharePath = shareToken ? `/mattress/s/${shareToken}` : '/mattress';
    const link = `${window.location.origin}${sharePath}`;

    const customerName = row["Customer Name"] || "there";
    const physioName = profile?.full_name?.replace(/^Dr\.?\s+/i, '') || 'Physio Specialist';

    const fullMessage = `Hi ${customerName},\n\nIt was a pleasure consulting with you today! As discussed, choosing the right spinal support makes all the difference for your posture and deep sleep recovery.\n\nExplore how your spine aligns on our patented SmartGRID™ vs ordinary memory foam in our 3D Interactive Lab:\n👉 ${link}\n\nWarm regards,\nDr. ${physioName} (PT)\nThe Sleep Company`;

    const encoded = encodeURIComponent(fullMessage);
    
    let url = `https://wa.me/${phone}?text=${encoded}`;
    if (appType === 'business') {
      url = `intent://send/?phone=${phone}&text=${encoded}#Intent;scheme=whatsapp;package=com.whatsapp.w4b;end`;
    } else if (appType === 'web') {
      url = `https://web.whatsapp.com/send?phone=${phone}&text=${encoded}`;
    }

    const now = new Date().toISOString();
    if (profile?.id) {
      recordFollowup(patientId, profile.id, customerName);
    }
    markTaskWhatsAppSent(id, { phone: row["Customer Number"], date: row["Date"], name: row["Customer Name"] });
    if (patientId) {
      updatePatientStatus(patientId, { followup_sent_at: now });
    }
    row.whatsapp_sent_at = now;

    window.open(url, '_blank');
  }

  // Partition into pending and completed
  const { pendingTasks, completedTasks } = useMemo(() => {
    const pending: Array<{ row: TrackerRow, id: string, patientId: string | null }> = []
    const completed: Array<{ row: TrackerRow, id: string, patientId: string | null }> = []
    const matchedPatientIds = new Set<string>()

    data.forEach(row => {
      const id = getTaskId(row)
      const patientId = getMatchedPatientId(row, id)
      
      if (patientId) {
        matchedPatientIds.add(patientId)
      }

      // If the row was deleted by the user, we skip rendering it
      if (deletedTasks.has(id)) {
        return;
      }

      const isFilled = Boolean(patientId) || filledForms.has(id)

      if (isFilled) {
        completed.push({ row, id, patientId })
      } else {
        pending.push({ row, id, patientId })
      }
    })

    // Add manually created forms (patients in db not matched to any Google Sheet row)
    dbPatients.forEach(p => {
      if (!matchedPatientIds.has(p.id)) {
        const manualId = p.tracker_id || p.id;
        
        // Skip rendering if the user deleted this manual entry
        if (deletedTasks.has(manualId)) {
          return;
        }

        const fakeRow: TrackerRow = {
          "Date": p.consultDate ? new Date(p.consultDate).toLocaleDateString() : new Date(p.created_at).toLocaleDateString(),
          "Customer Name": p.name || 'Unknown',
          "Customer Number": p.phone || 'N/A',
        }
        completed.push({ row: fakeRow, id: manualId, patientId: p.id })
      }
    })

    return { pendingTasks: pending, completedTasks: completed }
  }, [data, deletedTasks, filledForms, filledPatientIds, dbPatients])


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
                  const patient = dbPatients.find(p => p.id === patientId);
                  const isSent = Boolean(row.whatsapp_sent_at || row["Whatsapp followup done"]?.toLowerCase() === 'yes' || patient?.followup_sent_at);
                  const previewMessage = getPersonalizedMessage(row, id);
                  const customAdvice = getCustomerCustomMessage(patient, row);

                  return (
                    <React.Fragment key={id}>
                      <TableRow>
                        <TableCell className="font-medium">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-foreground font-semibold">{row["Customer Name"] || 'Unknown'}</span>
                              {isSent && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full">
                                  <Check className="w-3 h-3" /> Sent
                                </span>
                              )}
                            </div>
                            {(row.pain_point || row["Customer Concern/Painpoint"] || row.product_suggested || row["Product suggested"]) && (
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                                {(row.pain_point || row["Customer Concern/Painpoint"]) && (
                                  <span className="bg-primary/10 text-primary font-medium px-1.5 py-0.5 rounded text-[10px]">
                                    {row.pain_point || row["Customer Concern/Painpoint"]}
                                  </span>
                                )}
                                {(row.product_suggested || row["Product suggested"]) && (
                                  <span className="text-[10px] text-muted-foreground">
                                    • {row.product_suggested || row["Product suggested"]}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{row["Customer Number"] || 'N/A'}</TableCell>
                        <TableCell>
                          {isFilled ? (
                            <Button 
                              variant="default" 
                              onClick={() => handleFillFormClick(id)}
                              className="bg-green-600 hover:bg-green-700 text-white w-full text-xs"
                            >
                              {isExpanded ? 'Close Form' : 'Form Filled'}
                            </Button>
                          ) : (
                            <Button 
                              variant="destructive" 
                              onClick={() => handleFillFormClick(id)}
                              className="w-full text-xs"
                            >
                              {isExpanded ? 'Close Form' : 'Fill Form'}
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col sm:flex-row gap-1 w-full">
                            <Button
                              variant="secondary"
                              className="flex-1 gap-1 text-[11px] h-7 px-1.5"
                              onClick={() => handlePreview(row, id)}
                              title="Preview Exercise Recovery Routine"
                            >
                              <Eye className="h-3 w-3" />
                              Routine
                            </Button>
                            <Button
                              variant="outline"
                              className="flex-1 gap-1 text-[11px] h-7 px-1.5 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10"
                              onClick={async () => {
                                const patientId = getMatchedPatientId(row, id);
                                const shareToken = patientId ? await createMattressShareToken(patientId) : null;
                                const link = shareToken ? `/mattress/s/${shareToken}` : '/mattress';
                                window.open(link, '_blank', 'noopener,noreferrer');
                              }}
                              title="Open 3D SmartGRID Posture Simulator"
                            >
                              <Sparkles className="h-3 w-3 text-cyan-400" />
                              SmartGRID
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1.5 w-full">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="outline"
                                  className={`flex-1 gap-1.5 text-xs px-2 ${
                                    isSent 
                                      ? 'border-emerald-600 text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/15' 
                                      : 'border-emerald-600 text-emerald-600 hover:bg-emerald-500/10'
                                  }`}
                                >
                                  {isSent ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <MessageCircle className="h-3.5 w-3.5" />}
                                  {isSent ? 'Sent' : 'WhatsApp'}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
                                  Exercise Recovery Plan
                                </DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleWhatsApp(row, id, 'default')}>
                                  {isSent ? 'Resend Recovery (Default)' : 'Send Recovery (Default)'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleWhatsApp(row, id, 'business')}>
                                  Send Recovery (WA Business)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleWhatsApp(row, id, 'web')}>
                                  Send Recovery (WA Web)
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />
                                
                                <DropdownMenuLabel className="text-[10px] text-cyan-400 uppercase font-mono tracking-wider flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-cyan-400" />
                                  SmartGRID™ (No Pain)
                                </DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleSleepScienceWhatsApp(row, id, 'default')} className="text-cyan-400 font-medium focus:text-cyan-300">
                                  Send Sleep Science (Default)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSleepScienceWhatsApp(row, id, 'business')} className="text-cyan-400 font-medium focus:text-cyan-300">
                                  Send Sleep Science (WA Business)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSleepScienceWhatsApp(row, id, 'web')} className="text-cyan-400 font-medium focus:text-cyan-300">
                                  Send Sleep Science (WA Web)
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <Button
                              variant="outline"
                              className="border-destructive/30 text-destructive hover:bg-destructive/10 px-2"
                              onClick={() => setTaskToDelete({ id, name: row["Customer Name"] || "this customer" })}
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
                            <div className="p-4 bg-muted/30 space-y-4">
                              {/* PREVIOUS MESSAGE & NOTES DISPLAY */}
                              <div className="p-4 rounded-xl border border-primary/25 bg-card/95 shadow-sm space-y-3">
                                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                                  <div className="flex items-center gap-2">
                                    <MessageCircle className="w-4 h-4 text-emerald-400" />
                                    <span className="font-semibold text-sm text-foreground">Previous Consultation Message & Notes</span>
                                  </div>
                                  {isSent ? (
                                    <span className="text-xs text-emerald-400 font-medium flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                                      <Check className="w-3.5 h-3.5" /> Follow-up Sent ({row.whatsapp_sent_at ? new Date(row.whatsapp_sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Verified'})
                                    </span>
                                  ) : (
                                    <span className="text-xs text-amber-400 font-medium bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                                      Pending Follow-up
                                    </span>
                                  )}
                                </div>

                                {/* Personalized Message Preview */}
                                <div className="space-y-1">
                                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    WhatsApp Message Sent / Queued for Customer:
                                  </div>
                                  <div className="p-3 rounded-lg bg-background/80 border border-border/60 text-xs font-mono leading-relaxed whitespace-pre-wrap text-foreground">
                                    {previewMessage}
                                  </div>
                                </div>

                                {/* Clinical Notes / Advice if available */}
                                {customAdvice && (
                                  <div className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/40">
                                    <span className="font-semibold text-foreground">Physio Consultation Notes / Sheet Advice: </span>
                                    {customAdvice}
                                  </div>
                                )}

                                <div className="flex flex-wrap gap-2 pt-1">
                                  <Button 
                                    size="sm"
                                    variant="outline" 
                                    className="text-xs border-emerald-600 text-emerald-500 hover:bg-emerald-500/10 gap-1.5"
                                    onClick={() => handleWhatsApp(row, id, 'default')}
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    {isSent ? 'Resend WhatsApp' : 'Send WhatsApp Now'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 gap-1.5"
                                    onClick={() => handleSleepScienceWhatsApp(row, id, 'default')}
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Send SmartGRID Posture Routine
                                  </Button>
                                </div>
                              </div>

                              {/* PRESCRIPTION / EDIT FORM */}
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg">
                                    {isFilled ? 'Update Consult Details & Routine' : 'New Consult Form'}
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0 sm:p-6">
                                  <CaptureForm 
                                    isEmbedded={true}
                                    initialData={{
                                      id: patientId,
                                      name: row["Customer Name"],
                                      phone: row["Customer Number"] ? String(row["Customer Number"]) : "",
                                      consultDate: row["Date"],
                                      tracker_id: id,
                                      painPointId: patient?.painPointId || row.pain_point || row["Customer Concern/Painpoint"] || '',
                                      conditionNotes: patient?.conditionNotes || {},
                                      whatsappMessage: customAdvice,
                                      recommendedExercises: patient?.recommendedExercises || [],
                                      comments: row.Comments || row.comments || ''
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
        No attended consultations available for this date.
      </div>
    )
  }

  return (
    <div>
      {renderTable(
        "Pending Follow-ups", 
        pendingTasks, 
        "All caught up! No pending follow-ups for this date."
      )}
      
      {renderTable(
        "Completed Follow-ups", 
        completedTasks, 
        "No completed follow-ups yet for this date."
      )}

      {/* Confirmation Modal for Permanent Deletion */}
      <ConfirmDialog
        open={Boolean(taskToDelete)}
        onOpenChange={(open) => {
          if (!open) setTaskToDelete(null);
        }}
        handleConfirm={handleConfirmDelete}
        title="Remove Customer from Tasks?"
        desc={`Are you sure you want to remove ${taskToDelete?.name || 'this customer'}? This entry will be permanently deleted from your follow-up queue in Supabase and will not reappear after refreshes or syncs.`}
        confirmText="Yes, Permanently Remove"
        destructive
      />
    </div>
  )
}
