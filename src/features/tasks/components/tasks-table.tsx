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
                            <CardContent className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Customer Name</Label>
                                  <Input value={row["Customer Name"]} readOnly className="bg-muted" />
                                </div>
                                <div className="space-y-2">
                                  <Label>Customer Number</Label>
                                  <Input value={row["Customer Number"]} readOnly className="bg-muted" />
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Physio Pitched</Label>
                                  <Select defaultValue="no">
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select Yes/No" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="yes">Yes</SelectItem>
                                      <SelectItem value="no">No</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Primary Category</Label>
                                  <Select>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="ortho">Ortho</SelectItem>
                                      <SelectItem value="neuro">Neuro</SelectItem>
                                      <SelectItem value="sports">Sports</SelectItem>
                                      <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label>Comments / Advice</Label>
                                <Input placeholder="Enter any additional advice or comments..." />
                              </div>

                              <div className="flex justify-end pt-4">
                                <Button onClick={() => handleDone(idx)} className="bg-primary px-8">
                                  Done
                                </Button>
                              </div>
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
