import React, { useState, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageCircle, Eye } from 'lucide-react'
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

export function TasksTable({ data }: TasksTableProps) {
  const { profile } = useAuth()
  const [expandedRowIdx, setExpandedRowIdx] = useState<number | null>(null)
  const [filledForms, setFilledForms] = useState<Set<number>>(new Set())
  const [filledPatientIds, setFilledPatientIds] = useState<Record<number, string>>({})
  const [dbPatients, setDbPatients] = useState<any[]>([])

  useEffect(() => {
    getPatients()
      .then(res => {
        if (res) setDbPatients(res)
      })
      .catch(err => console.error("Error fetching db patients:", err))
  }, [])

  const handleFillFormClick = (idx: number) => {
    if (expandedRowIdx === idx) {
      setExpandedRowIdx(null)
    } else {
      setExpandedRowIdx(idx)
    }
  }

  const handleDone = (idx: number, newId?: string) => {
    setFilledForms(prev => new Set(prev).add(idx))
    if (newId) {
      setFilledPatientIds(prev => ({ ...prev, [idx]: newId }))
    }
    setExpandedRowIdx(null)
  }

  const getMatchedPatientId = (row: TrackerRow, idx: number) => {
    if (filledPatientIds[idx]) return filledPatientIds[idx];
    const cleanPhone = (row["Customer Number"] || "").replace(/\D/g, '');
    const cleanName = (row["Customer Name"] || "").trim().toLowerCase();
    
    const found = dbPatients.find(p => {
      const pPhone = (p.phone || "").replace(/\D/g, '');
      const pName = (p.name || "").trim().toLowerCase();
      return (cleanPhone.length >= 7 && pPhone.length >= 7 && (pPhone.includes(cleanPhone) || cleanPhone.includes(pPhone))) ||
             (cleanName && pName && (cleanName === pName));
    });

    return found ? found.id : null;
  }

  const handlePreview = (row: TrackerRow, idx: number) => {
    const patientId = getMatchedPatientId(row, idx);
    if (patientId) {
      window.open(`/r/${patientId}`, '_blank');
    } else {
      window.open(`/map`, '_blank');
    }
  }

  const handleWhatsApp = (row: TrackerRow, idx: number) => {
    let phone = (row["Customer Number"] || "").replace(/\D/g, '');
    if (!phone) {
      alert("No phone number available for this customer.");
      return;
    }
    if (phone.length === 10) {
      phone = '91' + phone;
    }

    const patientId = getMatchedPatientId(row, idx);
    const cacheBuster = new Date().getTime();
    const link = patientId 
      ? `${window.location.origin}/r/${patientId}?v=${cacheBuster}` 
      : `${window.location.origin}/map`;

    const customerName = row["Customer Name"] || "there";
    const physioName = profile?.full_name?.replace(/^Dr\.?\s+/i, '') || 'Physio';

    const fullMessage = `Hi ${customerName},\n\nHope your body is treating you better!\n\nHere is your *Personalized 3D Recovery Plan* (including exercises and things to avoid):\n👉 ${link}\n\nLet me know if you have any questions.\n\nBest,\nDr. ${physioName}`;

    const encoded = encodeURIComponent(fullMessage);
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
  }

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer Name</TableHead>
            <TableHead>Customer Number</TableHead>
            <TableHead className="w-[140px]">Actions</TableHead>
            <TableHead className="w-[120px]">Preview</TableHead>
            <TableHead className="w-[130px]">Contact</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                No tasks available for this date.
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, idx) => {
              const isExpanded = expandedRowIdx === idx;
              const patientId = getMatchedPatientId(row, idx);
              const isFilled = Boolean(patientId) || filledForms.has(idx);

              return (
                <React.Fragment key={idx}>
                  <TableRow>
                    <TableCell className="font-medium">{row["Customer Name"] || 'Unknown'}</TableCell>
                    <TableCell>{row["Customer Number"] || 'N/A'}</TableCell>
                    <TableCell>
                      {isFilled ? (
                        <Button 
                          variant="default" 
                          onClick={() => handleFillFormClick(idx)}
                          className="bg-green-600 hover:bg-green-700 text-white w-full text-xs"
                        >
                          {isExpanded ? 'Cancel' : 'Form Filled'}
                        </Button>
                      ) : (
                        <Button 
                          variant="destructive" 
                          onClick={() => handleFillFormClick(idx)}
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
                        onClick={() => handlePreview(row, idx)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Preview
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="outline"
                        className="w-full gap-1.5 border-green-600 text-green-600 hover:bg-green-50 text-xs"
                        onClick={() => handleWhatsApp(row, idx)}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        WhatsApp
                      </Button>
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
                                  consultDate: row["Date"]
                                }}
                                onSuccess={(newId?: string) => handleDone(idx, newId)}
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
  )
}
