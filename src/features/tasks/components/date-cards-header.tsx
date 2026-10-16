import React from 'react'
import { Calendar, Users, Send, ArrowLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface DateSummary {
  dateKey: string;           // Normalized identifier, e.g. "2026-10-15"
  displayDate: string;       // Formatted human readable, e.g. "15 Oct"
  totalAttended: number;     // Customers where session_done === 'Yes'
  sentCount: number;         // Customers where whatsapp has been sent or consult filled
  pendingCount: number;      // Customers remaining to follow up
  percentage: number;        // Completion percentage (0 - 100)
  timestamp: number;         // Date timestamp for sorting
}

interface DateCardsHeaderProps {
  monthName: string;
  dateSummaries: DateSummary[];
  selectedDate: string;
  onSelectDate: (dateKey: string) => void;
  onBackToMonths: () => void;
}

export function DateCardsHeader({
  monthName,
  dateSummaries,
  selectedDate,
  onSelectDate,
  onBackToMonths,
}: DateCardsHeaderProps) {
  if (dateSummaries.length === 0) return null;

  return (
    <div className="w-full space-y-4">
      {/* Navigation bar with Back button and month title */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card/40 p-3 rounded-xl border border-border/60">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBackToMonths}
            className="gap-1.5 h-8 px-3 text-xs font-semibold hover:bg-muted/80 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Months
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <h3 className="text-base font-bold tracking-tight text-foreground">
              {monthName} Dates
            </h3>
            <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full font-medium">
              {dateSummaries.length} {dateSummaries.length === 1 ? 'date' : 'dates'}
            </span>
          </div>
        </div>

        <span className="text-xs text-muted-foreground hidden sm:inline-block">
          Select a date card to view and action pending follow-ups
        </span>
      </div>

      {/* Grid of Date Cards sorted Latest to Oldest */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3">
        {dateSummaries.map((summary) => {
          const isSelected = selectedDate === summary.dateKey;
          const { totalAttended, sentCount, pendingCount, percentage } = summary;

          // Traffic light color code:
          // Red: < 50%
          // Amber: 50% - 99%
          // Emerald: 100%
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
                  ? 'bg-card border-primary ring-2 ring-primary/20 shadow-md -translate-y-0.5'
                  : 'bg-card/70 hover:bg-card border-border/80 hover:border-primary/50 hover:shadow-sm hover:-translate-y-0.5'
              }`}
            >
              {/* Top row: Date & Status Badge */}
              <div className="flex items-start justify-between gap-1 mb-2">
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Consult Date
                  </span>
                  <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                    {summary.displayDate}
                  </span>
                </div>
                <span
                  className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${statusBadgeClass}`}
                >
                  {statusText}
                </span>
              </div>

              {/* Middle row: Stats counters */}
              <div className="my-2 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                    <Users className="h-3 w-3" /> Attended:
                  </span>
                  <span className="font-semibold text-foreground text-xs">{totalAttended}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                    <Send className="h-3 w-3" /> Sent:
                  </span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400 text-xs">
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

                <div className="mt-2 pt-1.5 border-t border-border/40 flex items-center justify-between text-[11px] font-medium text-primary group-hover:translate-x-0.5 transition-transform">
                  <span>View List</span>
                  <ChevronRight className="h-3 w-3" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
