import React, { useState } from 'react';
import { Log, LogStatus } from '../types';

interface LogsViewProps {
  logs: Log[];
  onClearLogs?: () => void;
  onNavigate: (screen: string) => void;
}

export default function LogsView({ logs, onClearLogs, onNavigate }: LogsViewProps) {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | LogStatus>('All');

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.medicineName.toLowerCase().includes(search.toLowerCase()) || 
                          log.detailText.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = activeFilter === 'All' || log.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  // Categorize logs by date
  const todayStr = new Date().toDateString();
  const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

  const todayLogs = filteredLogs.filter(log => new Date(log.timestamp).toDateString() === todayStr);
  const yesterdayLogs = filteredLogs.filter(log => new Date(log.timestamp).toDateString() === yesterdayStr);
  const olderLogs = filteredLogs.filter(log => {
    const dStr = new Date(log.timestamp).toDateString();
    return dStr !== todayStr && dStr !== yesterdayStr;
  });

  const renderLogItem = (log: Log, index: number, array: Log[]) => {
    let statusClass = 'bg-[#7cf994] text-[#007230]';
    let iconName = 'check_circle';

    if (log.status === 'Missed') {
      statusClass = 'bg-[#ffddb8] text-[#996100]';
      iconName = 'history';
    } else if (log.status === 'Cancelled') {
      statusClass = 'bg-[#f0f3ff] text-[#737686] border border-[#c3c6d7]';
      iconName = 'cancel';
    } else if (log.status === 'Failed') {
      statusClass = 'bg-[#ffdad6] text-[#93000a]';
      iconName = 'error';
    }

    const logTime = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isLast = index === array.length - 1;

    return (
      <div key={log.id} className="relative flex gap-4 timeline-item">
        {/* Connector line */}
        {!isLast && (
          <div className="absolute left-6 top-12 bottom-[-24px] w-[2px] bg-[#cbd5e1] pointer-events-none"></div>
        )}

        <div className={`z-10 w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
          log.status === 'Taken' ? 'bg-[#7cf994]/30 text-[#007230]' : 
          log.status === 'Missed' ? 'bg-[#ffddb8]/30 text-[#996100]' : 
          log.status === 'Cancelled' ? 'bg-[#f0f3ff] text-[#737686] border border-[#c3c6d7]' : 
          'bg-[#ffdad6]/50 text-[#93000a]'
        }`}>
          <span className="material-symbols-outlined fill-icon text-xl">{iconName}</span>
        </div>

        <div className="flex-grow bg-white p-4 rounded-2xl shadow-sm border border-[#c3c6d7]/30">
          <div className="flex justify-between items-start mb-1.5">
            <div>
              <h3 className="font-bold text-sm text-[#111c2d]">{log.medicineName}</h3>
              <p className="text-[10px] text-[#737686] font-mono mt-0.5">{logTime} • {log.dosageText}</p>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${statusClass}`}>
              {log.status === 'Taken' ? 'Taken' : log.status}
            </span>
          </div>
          <p className="text-xs text-[#434655] font-medium leading-relaxed">{log.detailText}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pt-2">
      {/* Top action header */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-1.5 text-xs text-[#004ac6] font-bold"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          <span>Back to Dashboard</span>
        </button>
        {onClearLogs && logs.length > 0 && (
          <button
            onClick={() => {
              if (confirm('Are you sure you want to clear all history?')) {
                onClearLogs();
              }
            }}
            className="text-xs text-[#ba1a1a] font-bold hover:underline"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Title */}
      <section className="space-y-1">
        <h2 className="text-xl font-bold text-[#111c2d] tracking-tight">Medication Log Timeline</h2>
        <p className="text-xs text-[#737686]">Audited telemetry of dispensing schedules</p>
      </section>

      {/* Search & Status Filters */}
      <section className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-grow">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737686] text-lg">search</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search medication logs..."
              className="w-full h-11 pl-10 pr-4 rounded-xl border-none bg-white shadow-sm focus:ring-2 focus:ring-[#004ac6] text-xs font-medium text-[#111c2d]"
            />
          </div>
        </div>

        {/* Filter Badges */}
        <div className="flex gap-1.5 overflow-x-auto pb-1.5 hide-scrollbar scroll-smooth">
          {(['All', 'Taken', 'Missed', 'Cancelled', 'Failed'] as const).map(filter => {
            const isSelected = activeFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold border transition-all shrink-0 whitespace-nowrap active:scale-95 ${
                  isSelected
                    ? 'bg-[#004ac6] text-white border-[#004ac6] shadow-sm'
                    : 'bg-white text-[#737686] border-[#c3c6d7]/30 hover:bg-[#f0f3ff]'
                }`}
              >
                {filter === 'All' ? 'All Logs' : filter === 'Taken' ? 'Taken' : filter}
              </button>
            );
          })}
        </div>
      </section>

      {/* Timeline entries list */}
      <div className="space-y-8 pt-2">
        {/* Today Group */}
        {todayLogs.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-3.5">
              <h2 className="text-[10px] font-bold text-[#737686] uppercase tracking-widest font-mono shrink-0">Today</h2>
              <div className="h-px bg-[#cbd5e1] flex-grow"></div>
            </div>
            <div className="space-y-6">
              {todayLogs.map((log, index) => renderLogItem(log, index, todayLogs))}
            </div>
          </section>
        )}

        {/* Yesterday Group */}
        {yesterdayLogs.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-3.5">
              <h2 className="text-[10px] font-bold text-[#737686] uppercase tracking-widest font-mono shrink-0">Yesterday</h2>
              <div className="h-px bg-[#cbd5e1] flex-grow"></div>
            </div>
            <div className="space-y-6">
              {yesterdayLogs.map((log, index) => renderLogItem(log, index, yesterdayLogs))}
            </div>
          </section>
        )}

        {/* Older Group */}
        {olderLogs.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-3.5">
              <h2 className="text-[10px] font-bold text-[#737686] uppercase tracking-widest font-mono shrink-0">Past Logs</h2>
              <div className="h-px bg-[#cbd5e1] flex-grow"></div>
            </div>
            <div className="space-y-6">
              {olderLogs.map((log, index) => renderLogItem(log, index, olderLogs))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {filteredLogs.length === 0 && (
          <div className="bg-white p-8 rounded-2xl text-center border border-[#c3c6d7] shadow-sm">
            <span className="material-symbols-outlined text-4xl text-[#737686]">info</span>
            <p className="text-sm font-medium text-[#434655] mt-2">No matching logs found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
