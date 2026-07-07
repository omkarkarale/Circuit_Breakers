import React, { useContext, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import { nativeAlert } from '../utils/dialogs';

interface AboutViewProps {
  onNavigate: (screen: string) => void;
}

export default function AboutView({ onNavigate }: AboutViewProps) {
  const { settings, updateSettings, showToast } = useContext(AppContext)!;
  const clickCount = useRef(0);
  const lastClickTime = useRef(0);

  const handleLogoClick = () => {
    const now = Date.now();
    if (now - lastClickTime.current > 5000) {
      clickCount.current = 1;
    } else {
      clickCount.current += 1;
    }
    lastClickTime.current = now;

    if (clickCount.current >= 7) {
      if (!settings.isDeveloperMode) {
        updateSettings({ isDeveloperMode: true });
        showToast('Developer Mode Enabled! Settings -> Developer Tools is now visible.', 'success');
      }
      clickCount.current = 0;
    } else if (clickCount.current >= 3) {
      showToast(`Tap ${7 - clickCount.current} more times to activate developer mode`, 'info');
    }
  };

  return (
    <div className="space-y-6 pt-2 text-light dark:text-white">
      {/* Navigation Header */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => onNavigate('settings')}
          className="flex items-center gap-1.5 text-xs text-accent dark:text-[#7cf994] font-bold cursor-pointer hover:underline"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          <span>Back to Settings</span>
        </button>
        <button
          onClick={() => nativeAlert('MedLink IoT Platform Details')}
          className="material-symbols-outlined text-muted hover:text-accent p-2 hover:bg-white/50 rounded-sm transition-colors active:scale-95 cursor-pointer"
        >
          share
        </button>
      </div>

      {/* Brand Identity Section */}
      <section className="flex flex-col items-center justify-center text-center py-4">
        <div 
          onClick={handleLogoClick}
          className="w-20 h-20 bg-accent dark:bg-slate-800 rounded-sm flex items-center justify-center shadow-md mb-4 active:scale-95 transition-transform cursor-pointer border border-accent/20"
        >
          <span className="material-symbols-outlined text-white dark:text-[#7cf994] text-[44px]">medical_services</span>
        </div>
        <h2 className="text-xl font-bold tracking-tight">MedLink IoT</h2>
        <p className="text-xs font-semibold text-accent dark:text-[#7cf994] mt-1">Smart Medicine Dispenser</p>
      </section>

      {/* Info Stats Grid */}
      <div className="grid grid-cols-1 gap-3.5">
        <div className="card-glass p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-success-bg/40 text-success-custom dark:bg-[#7cf994]/20 dark:text-[#7cf994] flex items-center justify-center border border-success-custom/10">
              <span className="material-symbols-outlined text-lg">memory</span>
            </div>
            <div>
              <p className="text-[10px] text-muted dark:text-slate-400 uppercase font-bold tracking-wider">Device Firmware</p>
              <p className="text-sm font-bold font-mono leading-none mt-1">v1.0.0 Stable</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-success-custom text-lg">verified</span>
        </div>
      </div>

      {/* Team Section */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold text-muted dark:text-slate-400 uppercase tracking-wider px-1">Developed By</h3>
        <div className="space-y-2.5">
          {[
            { name: 'Omkar Karale', role: 'Hardware & Firmware' },
            { name: 'Rajnarayan Hazra', role: 'IoT Integration & UI' },
            { name: 'Ekansh Bansode', role: 'System Architect' }
          ].map(dev => (
            <div key={dev.name} className="flex items-center p-3 card-glass">
              <div className="w-9 h-9 rounded-sm bg-accent-light dark:bg-slate-800 text-accent dark:text-[#7cf994] flex items-center justify-center shrink-0 border border-accent/10">
                <span className="material-symbols-outlined text-sm">person</span>
              </div>
              <div className="ml-3 flex-grow">
                <p className="text-xs font-bold">{dev.name}</p>
                <p className="text-[10px] text-muted dark:text-slate-455 font-medium mt-0.5">{dev.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold text-muted dark:text-slate-400 uppercase tracking-wider px-1">Technology Stack</h3>
        <div className="flex flex-wrap gap-2 px-1">
          {[
            'React',
            'TypeScript',
            'Tailwind CSS',
            'ESP8266',
            'REST API',
            'PlatformIO',
            'Developer Tools'
          ].map(tech => (
            <span key={tech} className="px-3 py-1 bg-accent-light dark:bg-slate-800 text-accent dark:text-[#7cf994] border border-accent/15 rounded-sm text-xs font-semibold">
              {tech}
            </span>
          ))}
        </div>
      </section>

      {/* Legal & Credits Footer */}
      <footer className="pt-4 pb-4 flex flex-col items-center gap-3 text-center border-t border-border-custom dark:border-slate-800">
        <div className="flex gap-3 text-[11px] font-semibold text-accent dark:text-[#7cf994]">
          <a className="hover:underline" href="#" onClick={e => { e.preventDefault(); nativeAlert('System Privacy policy.'); }}>Privacy Policy</a>
          <span className="text-border-custom dark:text-slate-800">•</span>
          <a className="hover:underline" href="#" onClick={e => { e.preventDefault(); nativeAlert('System Terms of Service.'); }}>Terms of Service</a>
        </div>
        <p className="text-[10px] text-muted max-w-xs leading-relaxed">
          © 2026 MedLink Technologies. Engineered for patient safety and clinical resilience.
        </p>
      </footer>
    </div>
  );
}
