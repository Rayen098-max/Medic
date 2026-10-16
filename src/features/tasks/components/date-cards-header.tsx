import React from 'react'
import { Calendar, Users, Send, CheckCircle2, Clock, AlertCircle } from 'lucide-react'

export interface DateSummary {
  dateKey: string;           // Normalized identifier, e.g. "2026-10-15" or raw "15/10"
  displayDate: string;       // Formatted human readable, e.g. "15 Oct 2026"
  totalAttended: number;     // Customers where session_done === 'Yes'
  sentCount: number;         // Customers where whatsapp has been sent or consult filled
  pendingCount: number;      // Customers remaining to follow up
  percentage: number;        // Completion percentage (0 - 100)
}

interface DateCardsHeaderProps {
  dateSummaries: DateSummary[];
  selectedDate: string;
  onSelectDate: (dateKey: string) => void;
}

export function DateCardsHeader({
  dateSummaries,
  selectedDate,
  onSelectDate,
}: DateCardsHeaderProps) {
  if (dateSummaries.length === 0) return null;

  return (
    <div className="w-full mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold tracking-tight">Consultation Dates</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          Showing dates with attended consultations (Session Done = Yes)
        </span>
      </div>

      {/* Horizontal scrolling card deck */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3 overflow-x-auto pb-2 pt-1">
        {dateSummaries.map((summary) => {
          const isSelected = selectedDate === summary.dateKey;
          const { totalAttended, sentCount, pendingCount, percentage } = summary;

          // Traffic light color code:
          // Red: < 50%
          // Yellow: 50% - 99%
          // Green: 100%
          let statusBadgeClass = 'bg-red-500/10 text-red-500 border-red-500/20';
          let progressBgClass = 'bg-red-500';
          let statusText = 'Pending';

          if (percentage === 100) {
            statusBadgeClass = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            progressBgClass = 'bg-emerald-500';
            statusText = 'Completed';
          } else if (percentage >= 50) {
            statusBadgeClass = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            progressBgClass = 'bg-amber-500';
            statusText = 'In Progress';
          }

          return (
            <button
              key={summary.dateKey}
              onClick={() => onSelectDate(summary.dateKey)}
              className={`text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer relative flex flex-col justify-between group ${
                isSelected
                  ? 'bg-card border-primary ring-2 ring-primary/20 shadow-md translate-y-[-2px]'
                  : 'bg-card/70 hover:bg-card border-border/80 hover:border-primary/40 hover:shadow-sm'
              }`}
            >
              {/* Top row: Date & Status Badge */}
              <div className="flex items-start justify-between gap-1 mb-2">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                    Consult Date
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {summary.displayDate}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusBadgeClass}`}
                >
                  {statusText}
                </span>
              </div>

              {/* Middle row: Stats counters */}
              <div className="my-2 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" /> Attended:
                  </span>
                  <span className="font-semibold text-foreground">{totalAttended}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Send className="h-3 w-3" /> Sent:
                  </span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    {sentCount} / {totalAttended}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-2">
                <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${progressBgClass}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="flex justify-between items-center mt-1 text-[10px] text-muted-foreground">
                  <span>{percentage}% done</span>
                  {pendingCount > 0 && (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      {pendingCount} left
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
