import React from 'react'
import { Calendar, Users, Send, ChevronRight, Layers } from 'lucide-react'

export interface MonthSummary {
  monthKey: string;          // e.g. "2026-10"
  monthName: string;         // e.g. "October 2026"
  totalAttended: number;     // Sum of session_done === 'Yes' in this month
  sentCount: number;         // Sum of whatsapp sent or consult completed
  pendingCount: number;      // totalAttended - sentCount
  percentage: number;        // (sentCount / totalAttended) * 100
  timestamp: number;         // for sorting
  dateCount: number;         // number of consultation dates in this month
}

interface MonthCardsHeaderProps {
  monthSummaries: MonthSummary[];
  onSelectMonth: (monthKey: string) => void;
}

export function MonthCardsHeader({
  monthSummaries,
  onSelectMonth,
}: MonthCardsHeaderProps) {
  if (monthSummaries.length === 0) return null;

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold tracking-tight">Select Month</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          Showing months with attended consultations (Session Done = Yes)
        </span>
      </div>

      {/* Grid of Month Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {monthSummaries.map((summary) => {
          const { monthKey, monthName, totalAttended, sentCount, pendingCount, percentage, dateCount } = summary;

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
              key={monthKey}
              onClick={() => onSelectMonth(monthKey)}
              className="group text-left p-4 rounded-xl border border-border/80 bg-card/80 hover:bg-card hover:border-primary/50 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between"
            >
              <div>
                {/* Header: Month Name & Status Badge */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                      Consultation Month
                    </span>
                    <h4 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                      {monthName}
                    </h4>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusBadgeClass}`}>
                    {statusText}
                  </span>
                </div>

                {/* Subtitle: Date count */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                  <Layers className="h-3.5 w-3.5 text-muted-foreground/70" />
                  <span>{dateCount} active consult {dateCount === 1 ? 'date' : 'dates'}</span>
                </div>

                {/* Key Stats: Attended & Sent */}
                <div className="space-y-1.5 mb-3 bg-muted/30 p-2.5 rounded-lg border border-border/40">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" /> Total Attended:
                    </span>
                    <span className="font-bold text-foreground text-sm">{totalAttended}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Send className="h-3.5 w-3.5" /> Follow-ups Sent:
                    </span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {sentCount} / {totalAttended}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom: Progress bar & Action link */}
              <div>
                <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden mb-1.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${progressBgClass}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-medium">{percentage}% done</span>
                  {pendingCount > 0 ? (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      {pendingCount} left
                    </span>
                  ) : (
                    <span className="text-emerald-500 font-medium">All Sent</span>
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
                  <span>View Date Cards</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
