import React from 'react';
import { useApp } from './hooks/useApp';

// Import Screens
import DashboardScreen from './screens/DashboardScreen';
import MedicinesScreen from './screens/MedicinesScreen';
import AddEditMedicineScreen from './screens/AddEditMedicineScreen';
import DiagnosticsScreen from './screens/DiagnosticsScreen';
import LogsScreen from './screens/LogsScreen';
import SettingsScreen from './screens/SettingsScreen';
import WiFiSetupScreen from './screens/WiFiSetupScreen';
import AboutScreen from './screens/AboutScreen';
import HardwareSimulatorScreen from './screens/HardwareSimulatorScreen';

// Unified Navigation Component
import BottomNavigation from './components/BottomNavigation';

export default function App() {
  const {
    medicines,
    logs,
    hardware,
    config,
    settings,
    currentScreen,
    currentClockTime,
    selectedMedicineId,
    isDarkMode,
    toast,
    setCurrentScreen,
    setSelectedMedicineId,
    updateSettings,
    showToast,
    saveMedicine,
    deleteMedicine,
    toggleEnabled,
    refillMedicine,
    refillAll,
    testComponent,
    resetComponent,
    runFullDiagnostics,
    restartDevice,
    saveWiFiConfig,
    triggerDispense,
    emergencyDispense,
    clearLogs
  } = useApp();

  // Router for screens inside our device mockup
  const renderScreenContent = () => {
    switch (currentScreen) {
      case 'home':
        return (
          <DashboardScreen
            medicines={medicines}
            logs={logs}
            config={config}
            onNavigate={(scr, id) => {
              setCurrentScreen(scr);
              if (id) setSelectedMedicineId(id);
            }}
            onRefillAll={refillAll}
            onTriggerDispense={triggerDispense}
            onEmergencyDispense={emergencyDispense}
            currentClockTime={currentClockTime}
            settings={settings}
          />
        );
      case 'medicines':
        return (
          <MedicinesScreen
            medicines={medicines}
            logs={logs}
            onNavigate={(scr, id) => {
              setCurrentScreen(scr);
              if (id) setSelectedMedicineId(id);
            }}
            onToggleEnabled={toggleEnabled}
            onRefill={refillMedicine}
          />
        );
      case 'diagnostics':
        return (
          <DiagnosticsScreen
            hardware={hardware}
            onTestComponent={testComponent}
            onResetComponent={resetComponent}
            onRunFullDiagnostics={runFullDiagnostics}
            internalTemp={config.internalTemp}
            config={config}
            settings={settings}
            onUpdateSettings={updateSettings}
          />
        );
      case 'settings':
        return (
          <SettingsScreen
            config={config}
            settings={settings}
            onNavigate={setCurrentScreen}
            onRestartDevice={restartDevice}
            onUpdateSettings={updateSettings}
          />
        );
      case 'add-edit':
        return (
          <AddEditMedicineScreen
            medicineId={selectedMedicineId}
            medicines={medicines}
            onSave={saveMedicine}
            onDelete={deleteMedicine}
            onNavigate={(scr, id) => {
              setCurrentScreen(scr);
              if (id) setSelectedMedicineId(id);
            }}
          />
        );
      case 'wifi-setup':
        return (
          <WiFiSetupScreen
            currentSSID={config.ssid}
            onSaveConfig={saveWiFiConfig}
            onNavigate={setCurrentScreen}
          />
        );
      case 'about':
        return <AboutScreen onNavigate={setCurrentScreen} />;
      case 'logs-list':
        return (
          <LogsScreen
            logs={logs}
            onClearLogs={clearLogs}
            onNavigate={setCurrentScreen}
          />
        );
      case 'hardware-simulator':
        return (
          <HardwareSimulatorScreen
            onNavigate={setCurrentScreen}
          />
        );
      default:
        return <div className="text-center p-4">Screen not found</div>;
    }
  };

  return (
    <div className={`relative h-screen flex flex-col overflow-hidden bg-bg-page dark:bg-slate-950 ${isDarkMode ? 'dark' : ''} select-none`}>
      
      {/* Ambient gradient blobs behind glass cards */}
      <div className="absolute top-[-10%] left-[-15%] w-[80%] h-[50%] rounded-full bg-accent/8 dark:bg-accent/15 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-15%] w-[80%] h-[50%] rounded-full bg-blue-500/8 dark:bg-blue-600/10 blur-3xl pointer-events-none"></div>

      {/* Toast Notification Banner */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-sm shadow-md border text-xs font-semibold flex items-center gap-2 animate-bounce ${
          toast.type === 'success' ? 'bg-success-bg text-success-custom border-success-custom/20 dark:bg-slate-800 dark:border-emerald-500/30 dark:text-[#a78bfa]' :
          toast.type === 'error' ? 'bg-error-bg text-error-custom border-error-custom/20 dark:bg-slate-800 dark:border-red-500/30 dark:text-red-400' :
          'bg-accent-light text-accent border-accent/20 dark:bg-slate-800 dark:border-blue-500/30 dark:text-blue-400'
        }`}>
          <span className="material-symbols-outlined text-base">
            {toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info'}
          </span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Custom App Bar matching specs */}
      <div className="w-full h-14 flex justify-between items-center px-6 py-2 navbar-glass text-light dark:text-white shrink-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-sm bg-accent-light dark:bg-slate-800/80 border border-accent/25 flex items-center justify-center overflow-hidden">
            <span className="material-symbols-outlined text-accent dark:text-[#a78bfa] text-xl font-bold">medical_services</span>
          </div>
          <h1 className="text-base font-bold text-accent dark:text-[#a78bfa] font-sans">MedLink IoT</h1>
        </div>
        {currentScreen !== 'logs-list' ? (
          <button
            type="button"
            onClick={() => {
              setCurrentScreen('logs-list');
            }}
            className="w-9 h-9 flex items-center justify-center rounded-sm hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-accent dark:text-[#a78bfa] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">notifications</span>
          </button>
        ) : (
          <div className="w-9 h-9" />
        )}
      </div>

      {/* Handheld Scrollable Viewport Canvas */}
      <main className="flex-1 overflow-y-auto px-5 py-4 pb-24 scrollbar-none scroll-smooth relative z-10">
        {renderScreenContent()}
      </main>

      {/* Handheld Reusable Navigation Bar */}
      <BottomNavigation
        currentScreen={currentScreen}
        onNavigate={(screen) => {
          setCurrentScreen(screen);
          setSelectedMedicineId(null);
        }}
      />
    </div>
  );
}
