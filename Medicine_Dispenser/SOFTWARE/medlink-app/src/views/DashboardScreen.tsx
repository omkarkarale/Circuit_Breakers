import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ApiClient, HomeResponse } from '../services/apiClient';
import { activityIcon } from '../utils/activityIcon';

// ─── Types ────────────────────────────────────────────────────────────────────
type NextDose = HomeResponse['nextDoses'][number];
type NextDoseGroup = {
  scheduledTime: string;
  countdownSeconds: number;
  isToday?: boolean;
  doses: NextDose[];
};
type ScheduleRow = HomeResponse['todaySchedule'][number];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime12h(t: string): string {
  const match = t.match(/^(\d{2}):(\d{2})$/);
  if (!match) return t;
  let h = parseInt(match[1]);
  const m = match[2];
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function formatCountdown(secs: number): string {
  if (secs <= 0) return 'Now';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

function formatRelativeTime(unixSec: number): string {
  const diffSec = Math.floor(Date.now() / 1000) - unixSec;
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

function groupNextDoses(nextDoses: NextDose[]): NextDoseGroup[] {
  const groups = new Map<string, NextDoseGroup>();

  nextDoses.forEach(dose => {
    const existing = groups.get(dose.scheduledTime);
    if (existing) {
      existing.doses.push(dose);
      return;
    }

    groups.set(dose.scheduledTime, {
      scheduledTime: dose.scheduledTime,
      countdownSeconds: dose.countdownSeconds,
      isToday: dose.isToday,
      doses: [dose]
    });
  });

  return Array.from(groups.values()).sort((a, b) => a.countdownSeconds - b.countdownSeconds);
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

/** Live countdown for the next-due dose group shown in the Home hero. */
function NextDoseHero({ group, deviceTimeDeltaSec }: { group: NextDoseGroup; deviceTimeDeltaSec: number }) {
  const [secs, setSecs] = useState(() => Math.max(0, group.countdownSeconds - deviceTimeDeltaSec));

  useEffect(() => {
    setSecs(Math.max(0, group.countdownSeconds - deviceTimeDeltaSec));
  }, [group.countdownSeconds, deviceTimeDeltaSec]);

  const isZeroOrLess = secs <= 0;
  useEffect(() => {
    if (isZeroOrLess) return;
    const id = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [isZeroOrLess]);

  const urgent = secs < 600; // < 10 min

  return (
    <div className="relative z-10 flex flex-col gap-4">
      {/* Header */}
      <p className="text-[11px] font-bold uppercase tracking-widest text-teal-100/80">
        Next scheduled dose
      </p>

      {/* Medicines */}
      <div className="space-y-3">
        {group.doses.map((dose, index) => (
          <div
            key={`${dose.slot}-${dose.medicineName}-${index}`}
            className="flex items-start justify-between gap-4"
          >
            {/* Left */}
            <div className="min-w-0 flex-1">
              <p className="text-2xl font-bold leading-tight truncate">
                {dose.medicineName}
              </p>

              {dose.notes && (
                <p className="mt-1 text-xs text-teal-100/90 truncate">
                  {dose.notes}
                </p>
              )}
            </div>

            {/* Right */}
            <div className="shrink-0 text-right">
              <p className="text-base font-bold text-white">
                {dose.dose} {dose.dose === 1 ? "pill" : "pills"}
              </p>

              <p className="mt-1 text-xs font-semibold text-teal-100">
                {formatTime12h(dose.scheduledTime)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Countdown */}
      <p
        className={`text-2xl font-bold font-mono tabular-nums leading-none ${urgent && secs > 0 ? "text-rose-200" : "text-white"
          }`}
      >
        {formatCountdown(secs)}
      </p>
    </div>
  );
}

/** Row in Today's Schedule */
function ScheduleRow({ row }: { row: ScheduleRow }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-3 py-3 px-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{row.medicineName}</span>
        </div>
        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 font-mono">
          {formatTime12h(row.scheduledTime)}
        </span>
      </div>
      <div className="h-px bg-slate-100 dark:bg-slate-800 mx-1" />
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="material-symbols-outlined text-base text-teal-600 dark:text-teal-400">{icon}</span>
      <h2 className="text-[10px] font-bold uppercase tracking-widest text-teal-650 dark:text-teal-400">{label}</h2>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DashboardView({ onOpenLogs }: { onOpenLogs: () => void }) {
  const [data, setData] = useState<HomeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Only show doses scheduled for TODAY
  const todayDoses = data?.nextDoses?.filter(d => d.isToday !== false) ?? [];
  const nextDoseGroups = groupNextDoses(todayDoses);

  // Delta (seconds) between client clock and device clock — kept in state so
  // NextDoseHero re-renders when a poll refreshes it.
  const [deviceDelta, setDeviceDelta] = useState(0);

  // Pull-to-refresh touch handling
  const touchStartY = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const res = await ApiClient.getHome();
      // Compute clock drift at moment response arrives
      const clientNowSec = Math.floor(Date.now() / 1000);
      if (res.deviceTime) {
        setDeviceDelta(clientNowSec - res.deviceTime);
      }
      setData(res);
    } catch {
      setError('Could not reach dispenser. Check connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData(false);
    const poll = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(poll);
  }, [fetchData]);


  // ── pull-to-refresh ────────────────────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    const atTop = scrollRef.current ? scrollRef.current.scrollTop === 0 : false;
    if (dy > 60 && atTop && !refreshing) fetchData(true);
  };

  // ── loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-60 gap-4">
        <span className="material-symbols-outlined text-4xl text-teal-500 dark:text-teal-400 animate-spin">sync</span>
        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Loading home data…</p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex flex-col gap-5 pb-4"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* ── Pull-to-refresh spinner ── */}
      {refreshing && (
        <div className="flex justify-center pt-1">
          <span className="material-symbols-outlined text-lg text-teal-500 dark:text-teal-400 animate-spin">sync</span>
        </div>
      )}

      {/* ── TOP: next scheduled dose ── */}
      <div className="rounded-2xl bg-gradient-to-br from-teal-600 to-teal-700 dark:from-teal-700 dark:to-teal-900 p-5 text-white shadow-md relative overflow-hidden">
        {/* Decorative circle */}
        <div className="absolute -top-18 -right-14 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute -bottom-14 -right-12 w-36 h-36 rounded-full bg-white/5" />

        {nextDoseGroups.length ? <NextDoseHero group={nextDoseGroups[0]} deviceTimeDeltaSec={deviceDelta} /> : (
          <div className="relative z-10 flex flex-col items-center justify-center min-h-[180px] text-center">
            <p className="text-2xl font-bold text-teal-100 leading-tight">You're all caught up for today!</p>
            <p className="mt-2 text-sm text-teal-100/90">Take Care :)</p>
          </div>
        )}
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-rose-500 text-lg shrink-0">wifi_off</span>
          <div>
            <p className="text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>
            <button type="button" onClick={() => fetchData(false)} className="mt-1.5 text-[10px] font-bold text-rose-600 dark:text-rose-400 underline cursor-pointer">
              Retry
            </button>
          </div>
        </div>
      )}

      {/* ── TODAY'S SCHEDULE ── */}
      {data && data.todaySchedule && data.todaySchedule.length > 0 && (
        <section>
          <SectionHeader icon="calendar_today" label="Today's Schedule" />
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {data.todaySchedule.map((row, i) => (
              <div key={`${row.slot}-${i}`}>
                <ScheduleRow row={row} />
              </div>
            ))}
            {/* Remove last divider */}
          </div>
        </section>
      )}

      {/* ── RECENT ACTIVITY ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <SectionHeader icon="history" label="Recent Activity" />
          <button
            type="button"
            onClick={onOpenLogs}
            className="flex items-center gap-1 text-[10px] font-bold text-teal-600 dark:text-teal-400 cursor-pointer active:opacity-70"
          >
            <span>View all</span>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </button>
        </div>

        {data && data.recentActivity && data.recentActivity.length > 0 ? (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
            {data.recentActivity.slice(0, 5).map((act, i) => {
              const { icon, color } = activityIcon(act.type);
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <span className={`material-symbols-outlined text-lg shrink-0 ${color}`}>{icon}</span>
                  <p className="flex-1 text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">{act.detail}</p>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono shrink-0 ml-2">{formatRelativeTime(act.ts)}</span>
                </div>
              );
            })}
            {/* Tap-to-expand footer */}
            <button
              type="button"
              onClick={onOpenLogs}
              className="w-full py-3 flex items-center justify-center gap-1 text-[10px] font-bold text-teal-600 dark:text-teal-400 cursor-pointer bg-slate-50 dark:bg-slate-950 hover:bg-teal-50 dark:hover:bg-teal-900/10 transition-colors"
            >
              <span>See full log history</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <button
              type="button"
              onClick={onOpenLogs}
              className="w-full flex flex-col items-center gap-2 py-8 text-center cursor-pointer"
            >
              <span className="material-symbols-outlined text-3xl text-slate-300 dark:text-slate-700">history</span>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">No recent activity</p>
                <p className="text-[10px] text-teal-600 dark:text-teal-400 font-bold mt-1">Tap to open logs</p>
              </div>
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
