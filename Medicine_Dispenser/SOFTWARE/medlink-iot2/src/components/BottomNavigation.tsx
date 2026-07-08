import React from 'react';

interface BottomNavigationProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
}

export default function BottomNavigation({ currentScreen, onNavigate }: BottomNavigationProps) {
  const getTabClass = (tabName: string) => {
    const isTabActive =
      (tabName === 'home' && currentScreen === 'home') ||
      (tabName === 'medicines' && (currentScreen === 'medicines' || currentScreen === 'add-edit')) ||
      (tabName === 'diagnostics' && currentScreen === 'diagnostics') ||
      (tabName === 'settings' &&
        (currentScreen === 'settings' ||
          currentScreen === 'wifi-setup' ||
          currentScreen === 'about' ||
          currentScreen === 'logs-list' ||
          currentScreen === 'hardware-simulator'));

    return isTabActive
      ? 'flex flex-col items-center justify-center text-accent dark:text-[#a78bfa] transition-all duration-300 font-semibold active:scale-95 relative pb-1 after:absolute after:bottom-0 after:w-6 after:h-0.5 after:bg-accent dark:after:bg-[#a78bfa] after:rounded-full h-full w-[72px]'
      : 'flex flex-col items-center justify-center text-muted dark:text-slate-400 px-4 py-1 hover:text-accent dark:hover:text-[#a78bfa] transition-all duration-200 active:scale-90 h-full w-[72px]';
  };

  return (
    <nav className="absolute bottom-0 left-0 w-full h-[64px] navbar-glass flex justify-around items-center px-3 pb-safe z-40 select-none shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
      <button
        type="button"
        onClick={() => onNavigate('home')}
        className={getTabClass('home')}
      >
        <span className="material-symbols-outlined text-[20px]">home_health</span>
        <span className="text-[9px] font-bold tracking-wider uppercase mt-0.5">Home</span>
      </button>

      <button
        type="button"
        onClick={() => onNavigate('medicines')}
        className={getTabClass('medicines')}
      >
        <span className="material-symbols-outlined text-[20px]">medication</span>
        <span className="text-[9px] font-bold tracking-wider uppercase mt-0.5">Medicines</span>
      </button>

      <button
        type="button"
        onClick={() => onNavigate('diagnostics')}
        className={getTabClass('diagnostics')}
      >
        <span className="material-symbols-outlined text-[20px]">medical_services</span>
        <span className="text-[9px] font-bold tracking-wider uppercase mt-0.5">Diagnostics</span>
      </button>

      <button
        type="button"
        onClick={() => onNavigate('settings')}
        className={getTabClass('settings')}
      >
        <span className="material-symbols-outlined text-[20px]">settings</span>
        <span className="text-[9px] font-bold tracking-wider uppercase mt-0.5">Settings</span>
      </button>
    </nav>
  );
}
