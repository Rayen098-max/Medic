import React, { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageCircle } from 'lucide-react'
import CaptureForm from '@/components/CaptureForm'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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
  // Track which row is expanded (if any)
  const [expandedRowIdx, setExpandedRowIdx] = useState<number | null>(null)
  
  // Track which forms have been successfully submitted/filled
  const [filledForms, setFilledForms] = useState<Set<number>>(new Set())

  const handleFillFormClick = (idx: number) => {
    // Toggle expand/collapse
    if (expandedRowIdx === idx) {
      setExpandedRowIdx(null)
    } else {
      setExpandedRowIdx(idx)
    }
  }

  const handleDone = (idx: number) => {
    // Add to filled forms set
    setFilledForms(prev => new Set(prev).add(idx))
    // Collapse the row
    setExpandedRowIdx(null)
  }

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer Name</TableHead>
            <TableHead>Customer Number</TableHead>
            <TableHead className="w-[150px]">Actions</TableHead>
            <TableHead className="w-[150px]">Contact</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                No tasks available for this date.
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, idx) => {
              const isExpanded = expandedRowIdx === idx;
              const isFilled = filledForms.has(idx);

              return (
                <React.Fragment key={idx}>
                  <TableRow>
                    <TableCell className="font-medium">{row["Customer Name"] || 'Unknown'}</TableCell>
                    <TableCell>{row["Customer Number"] || 'N/A'}</TableCell>
                    <TableCell>
                      {isFilled ? (
                        <Button variant="default" className="bg-green-600 hover:bg-green-700 text-white w-full">
                          Form Filled
                        </Button>
                      ) : (
                        <Button 
                          variant="destructive" 
                          onClick={() => handleFillFormClick(idx)}
                          className="w-full"
                        >
                          {isExpanded ? 'Cancel' : 'Fill Form'}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="outline"
                        className="w-full gap-2 border-green-600 text-green-600 hover:bg-green-50"
                        onClick={() => {
                          if (row["Customer Number"]) {
                            window.open(`https://wa.me/${row["Customer Number"].replace(/\D/g, '')}`, '_blank');
                          }
                        }}
                      >
                        <MessageCircle className="h-4 w-4" />
                        WhatsApp
                      </Button>
                    </TableCell>
                  </TableRow>
                  
                  {isExpanded && (
                    <TableRow>
                      <TableCell colSpan={4} className="p-0 border-b-0">
                        <div className="p-4 bg-muted/30">
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">New Consult Form</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 sm:p-6">
                              <CaptureForm 
                                isEmbedded={true}
                                initialData={{
                                  name: row["Customer Name"],
                                  phone: row["Customer Number"] ? String(row["Customer Number"]) : "",
                                  consultDate: row["Date"]
                                }}
                                onSuccess={() => handleDone(idx)}
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
