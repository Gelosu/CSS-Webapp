"use client";

import { useState } from "react";
import type { LessonStat } from "@/lib/classroom-analytics";

const GRID_LINES = 4;

export function LessonBarChart({ stats }: { stats: LessonStat[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const maxTotal = Math.max(1, ...stats.map((s) => s.total));

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">Completion by lesson</h3>
        <div className="flex items-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-chart-series-1" />
            Lesson completed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-chart-series-2" />
            Activity completed
          </span>
        </div>
      </div>

      <div className="relative mt-6 h-52">
        <div className="absolute inset-0 flex flex-col justify-between">
          {Array.from({ length: GRID_LINES + 1 }).map((_, i) => (
            <div key={i} className="border-t border-chart-grid" />
          ))}
        </div>

        <div className="relative flex h-full items-end justify-between gap-1 px-1">
          {stats.map((stat) => {
            const lessonPct = (stat.lessonCompletedCount / maxTotal) * 100;
            const activityPct = (stat.activityCompletedCount / maxTotal) * 100;
            const isHovered = hovered === stat.key;
            return (
              <button
                type="button"
                key={stat.key}
                onMouseEnter={() => setHovered(stat.key)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(stat.key)}
                onBlur={() => setHovered(null)}
                className="relative flex h-full flex-1 items-end justify-center focus:outline-none"
              >
                <div className="flex h-full items-end gap-1">
                  <div className="flex h-full w-3 flex-col items-center justify-end">
                    {stat.lessonCompletedCount > 0 && (
                      <span className="mb-1 text-[10px] tabular-nums text-muted">
                        {stat.lessonCompletedCount}
                      </span>
                    )}
                    <div
                      className="w-full rounded-t bg-chart-series-1 transition-all"
                      style={{ height: `${lessonPct}%` }}
                    />
                  </div>
                  <div className="flex h-full w-3 flex-col items-center justify-end">
                    {stat.activityCompletedCount > 0 && (
                      <span className="mb-1 text-[10px] tabular-nums text-muted">
                        {stat.activityCompletedCount}
                      </span>
                    )}
                    <div
                      className="w-full rounded-t bg-chart-series-2 transition-all"
                      style={{ height: `${activityPct}%` }}
                    />
                  </div>
                </div>

                {isHovered && (
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-48 -translate-x-1/2 rounded-lg border border-border bg-surface-alt p-2.5 text-left shadow-lg">
                    <p className="text-xs font-medium text-foreground">{stat.title}</p>
                    <p className="mt-1 text-[11px] text-muted">
                      Lesson:{" "}
                      <span className="font-medium text-foreground">
                        {stat.lessonCompletedCount}/{stat.total}
                      </span>
                    </p>
                    <p className="text-[11px] text-muted">
                      Activity:{" "}
                      <span className="font-medium text-foreground">
                        {stat.activityCompletedCount}/{stat.total}
                      </span>
                    </p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex justify-between gap-1 px-1">
        {stats.map((stat, i) => (
          <span key={stat.key} className="flex-1 text-center text-[10px] text-muted">
            L{i + 1}
          </span>
        ))}
      </div>
    </div>
  );
}
