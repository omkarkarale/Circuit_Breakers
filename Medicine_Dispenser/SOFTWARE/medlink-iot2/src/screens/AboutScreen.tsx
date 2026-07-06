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
    <div className="space-y-6 pt-2 text-[#111c2d] dark:text-white">
      {/* Navigation Header */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => onNavigate('settings')}
          className="flex items-center gap-1.5 text-xs text-[#004ac6] dark:text-[#7cf994] font-bold"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          <span>Back to Settings</span>
        </button>
        <button
          onClick={() => nativeAlert('MedLink IoT Platform Details')}
          className="material-symbols-outlined text-[#737686] hover:text-[#004ac6] p-2 hover:bg-white/50 rounded-full transition-colors active:scale-95"
        >
          share
        </button>
      </div>

      {/* Brand Identity Section */}
      <section className="flex flex-col items-center justify-center text-center py-4">
        <div 
          onClick={handleLogoClick}
          className="w-20 h-20 bg-[#2563eb] dark:bg-slate-800 rounded-3xl flex items-center justify-center shadow-md mb-4 active:scale-95 transition-transform cursor-pointer border border-blue-500/20"
        >
          <span className="material-symbols-outlined text-white dark:text-[#7cf994] text-[44px]">medical_services</span>
        </div>
        <h2 className="text-xl font-bold tracking-tight">MedLink IoT</h2>
        <p className="text-xs font-semibold text-[#2563eb] dark:text-[#7cf994] mt-1">Smart Medicine Dispenser</p>
      </section>

      {/* Info Stats Grid */}
      <div className="grid grid-cols-1 gap-3.5">
        <div className="bg-white dark:bg-slate-850 p-4 rounded-xl border border-[#c3c6d7]/30 dark:border-slate-700/50 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#7cf994]/20 text-[#007230] dark:text-[#7cf994] flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">memory</span>
            </div>
            <div>
              <p className="text-[10px] text-[#737686] dark:text-slate-400 uppercase font-bold tracking-wider">Device Firmware</p>
              <p className="text-sm font-bold font-mono leading-none mt-1">v1.0.0 Stable</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-[#006e2d] dark:text-[#7cf994] text-lg">verified</span>
        </div>
      </div>

      {/* Team Section */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold text-[#737686] dark:text-slate-400 uppercase tracking-wider px-1">Developed By</h3>
        <div className="space-y-2.5">
          {[
            { name: 'Omkar Karale', role: 'Hardware & Firmware' },
            { name: 'Rajnarayan Hazra', role: 'IoT Integration & UI' },
            { name: 'Ekansh Bansode', role: 'System Architect' }
          ].map(dev => (
            <div key={dev.name} className="flex items-center p-3 bg-white dark:bg-slate-800 border border-[#c3c6d7]/20 dark:border-slate-700/30 rounded-xl transition-all">
              <div className="w-9 h-9 rounded-full bg-[#dee8ff] dark:bg-slate-700 text-[#004ac6] dark:text-[#7cf994] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-sm">person</span>
              </div>
              <div className="ml-3 flex-grow">
                <p className="text-xs font-bold">{dev.name}</p>
                <p className="text-[10px] text-[#737686] dark:text-slate-450 font-medium mt-0.5">{dev.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold text-[#737686] dark:text-slate-400 uppercase tracking-wider px-1">Technology Stack</h3>
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
            <span key={tech} className="px-3 py-1 bg-[#dee8ff] dark:bg-slate-800 text-[#004ac6] dark:text-[#7cf994] rounded-full text-xs font-semibold">
              {tech}
            </span>
          ))}
        </div>
      </section>

      {/* Legal & Credits Footer */}
      <footer className="pt-4 pb-4 flex flex-col items-center gap-3 text-center border-t border-[#cbd5e1]/30 dark:border-slate-750">
        <div className="flex gap-3 text-[11px] font-semibold text-[#004ac6] dark:text-[#7cf994]">
          <a className="hover:underline" href="#" onClick={e => { e.preventDefault(); nativeAlert('System Privacy policy.'); }}>Privacy Policy</a>
          <span className="text-[#c3c6d7]">•</span>
          <a className="hover:underline" href="#" onClick={e => { e.preventDefault(); nativeAlert('System Terms of Service.'); }}>Terms of Service</a>
        </div>
        <p className="text-[10px] text-[#737686] max-w-xs leading-relaxed">
          © 2026 MedLink Technologies. Engineered for patient safety and clinical resilience.
        </p>
      </footer>
    </div>
  );
}
