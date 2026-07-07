import React, { useState } from 'react';
import { Log } from '../types';

interface LogsViewProps {
  logs: Log[];
  onClearLogs: () => void;
  onNavigate: (screen: string) => void;
}

type FilterCategory = 'All' | 'Dispensed' | 'Missed' | 'Refilled' | 'Diagnostics' | 'WiFi' | 'Errors';

// Helper to resolve retrofitted category types for older/custom log formats
function resolveLogCategory(log: Log): FilterCategory {
  if (log.category) return log.category;

  // Fallbacks based on content
  const doseLower = log.dosageText.toLowerCase();
  const detailLower = log.detailText.toLowerCase();

  if (doseLower.includes('refill') || detailLower.includes('refill') || detailLower.includes('replenish')) {
    return 'Refilled';
  }
  if (doseLower.includes('ssid') || doseLower.includes('wifi') || detailLower.includes('wifi') || detailLower.includes('associated')) {
    return 'WiFi';
  }
  if (log.status === 'Missed') {
    return 'Missed';
  }
  if (log.status === 'Failed' || doseLower.includes('fail') || detailLower.includes('fail')) {
    return 'Errors';
  }
  if (doseLower.includes('diagnostic') || doseLower.includes('reboot') || doseLower.includes('test') || detailLower.includes('actuator') || detailLower.includes('check')) {
    return 'Diagnostics';
  }
  return 'Dispensed';
}

export default function LogsView({
  logs,
  onClearLogs
}: LogsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('All');

  // Filter badges list
  const categories: FilterCategory[] = ['All', 'Dispensed', 'Missed', 'Refilled', 'Diagnostics', 'WiFi', 'Errors'];

  // Process filtering and search
  const filteredLogs = logs.filter(log => {
    const category = resolveLogCategory(log);
    const matchesCategory = selectedCategory === 'All' || category === selectedCategory;

    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      log.medicineName.toLowerCase().includes(query) ||
      log.dosageText.toLowerCase().includes(query) ||
      log.detailText.toLowerCase().includes(query);

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 pt-2 text-light dark:text-white">
      {/* Header Summary */}
      <section className="card-glass p-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold">Activity Logs History</h2>
          <p className="text-[10px] text-muted dark:text-slate-400 mt-1 font-medium">
            {filteredLogs.length} events matching current filters
          </p>
        </div>
        {logs.length > 0 && (
          <button
            onClick={() => {
              if (confirm('Clear entire hardware diagnostic logs and history?')) {
                onClearLogs();
              }
            }}
            className="text-xs font-bold text-error-custom dark:text-red-400 hover:underline cursor-pointer"
          >
            Clear History
          </button>
        )}
      </section>

      {/* Interactive Search Bar */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search logs by keyword..."
          className="w-full h-11 pl-10 pr-4 input-custom text-xs"
        />
        <span className="material-symbols-outlined text-muted absolute left-3.5 top-1/2 -translate-y-1/2 text-lg">
          search
        </span>
      </div>

      {/* Categories Filter Badges Grid (Horizontally Scrollable chips) */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x">
        {categories.map(cat => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold shrink-0 transition-all active:scale-95 snap-center cursor-pointer border ${
                isActive
                  ? 'bg-accent border-accent text-white dark:bg-[#7cf994] dark:border-[#7cf994] dark:text-slate-950 shadow-sm'
                  : 'bg-primary/20 border-border-custom dark:border-slate-800 text-muted dark:text-slate-300 hover:bg-accent-light/45'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Activity Timeline logs */}
      <div className="space-y-3.5">
        {filteredLogs.map(log => {
          const cat = resolveLogCategory(log);
          
          // Style assignments
          let badgeColor = 'bg-accent dark:bg-[#7cf994] text-white dark:text-slate-900';
          let iconName = 'check_circle';

          if (cat === 'Missed') {
            badgeColor = 'bg-amber-600 dark:bg-amber-500 text-white';
            iconName = 'history';
          } else if (cat === 'Errors') {
            badgeColor = 'bg-error-custom text-white';
            iconName = 'error';
          } else if (cat === 'Refilled') {
            badgeColor = 'bg-teal-700 dark:bg-teal-600 text-white';
            iconName = 'replay';
          } else if (cat === 'WiFi') {
            badgeColor = 'bg-blue-600 dark:bg-blue-500 text-white';
            iconName = 'wifi';
          } else if (cat === 'Diagnostics') {
            badgeColor = 'bg-purple-600 dark:bg-purple-500 text-white';
            iconName = 'construction';
          }

          const logTime = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const logDate = new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });

          return (
            <div key={log.id} className="card-glass p-3.5 flex gap-4.5 items-start">
              <div className={`w-8 h-8 rounded-full ${badgeColor} flex items-center justify-center shrink-0 ring-4 ring-white dark:ring-slate-900 shadow-sm`}>
                <span className="material-symbols-outlined text-base fill-icon">{iconName}</span>
              </div>
              <div className="flex-grow">
                <div className="flex justify-between items-baseline">
                  <h4 className="text-xs font-bold leading-none">{log.medicineName}</h4>
                  <span className="text-[9px] text-muted dark:text-slate-400 font-mono">
                    {logDate} at {logTime}
                  </span>
                </div>
                <div className="text-[10px] font-bold text-accent dark:text-[#7cf994] mt-1.5">
                  {log.dosageText}
                </div>
                <p className="text-[10px] text-muted dark:text-slate-400 mt-1 leading-relaxed">
                  {log.detailText}
                </p>
                <div className="mt-2 text-[8px] font-extrabold uppercase tracking-wider text-muted px-2 py-0.5 bg-primary/25 border border-border-custom dark:border-slate-800 rounded-sm inline-block">
                  {cat}
                </div>
              </div>
            </div>
          );
        })}

        {filteredLogs.length === 0 && (
          <div className="card-glass p-8 text-center text-muted">
            <span className="material-symbols-outlined text-3xl">hourglass_empty</span>
            <p className="text-xs font-medium mt-2">No activity records match search criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
