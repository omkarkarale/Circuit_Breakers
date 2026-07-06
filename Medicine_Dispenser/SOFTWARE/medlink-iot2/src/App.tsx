import React from 'react';
import { useApp } from './hooks/useApp';

// Import Screens
import DashboardScreen from './screens/DashboardScreen';
import MedicinesScreen from './screens/MedicinesScreen';
import MedicineDetailsScreen from './screens/MedicineDetailsScreen';
import AddEditMedicineScreen from './screens/AddEditMedicineScreen';
import DiagnosticsScreen from './screens/DiagnosticsScreen';
import LogsScreen from './screens/LogsScreen';
import SettingsScreen from './screens/SettingsScreen';
import WiFiSetupScreen from './screens/WiFiSetupScreen';
import AboutScreen from './screens/AboutScreen';
import HardwareSimulatorScreen from './screens/HardwareSimulatorScreen';

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
      case 'details':
        const selectedMed = medicines.find(m => m.id === selectedMedicineId) || null;
        return (
          <MedicineDetailsScreen
            medicine={selectedMed}
            onNavigate={(scr, id) => {
              setCurrentScreen(scr);
              if (id) setSelectedMedicineId(id);
            }}
            onRefill={refillMedicine}
            onTriggerDispense={triggerDispense}
            onDelete={deleteMedicine}
          />
        );
      case 'add-edit':
        return (
          <AddEditMedicineScreen
            medicineId={selectedMedicineId}
            medicines={medicines}
            onSave={saveMedicine}
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

  // Determine standard tab highlights
  const getTabClass = (tabName: string) => {
    const isTabActive = 
      (tabName === 'home' && currentScreen === 'home') ||
      (tabName === 'medicines' && (currentScreen === 'medicines' || currentScreen === 'details' || currentScreen === 'add-edit')) ||
      (tabName === 'diagnostics' && currentScreen === 'diagnostics') ||
      (tabName === 'settings' && (currentScreen === 'settings' || currentScreen === 'wifi-setup' || currentScreen === 'about' || currentScreen === 'logs-list'));

    return isTabActive
      ? 'flex flex-col items-center justify-center bg-[#7cf994] text-[#007230] rounded-full px-5 py-1 transition-all duration-300 font-bold active:scale-95'
      : 'flex flex-col items-center justify-center text-[#434655] dark:text-[#c3c6d7] px-4 py-1 hover:bg-[#e7eeff] hover:text-[#004ac6] dark:hover:bg-slate-800 rounded-xl transition-all duration-200 active:scale-90';
  };

  return (
    <div className={`relative h-screen flex flex-col overflow-hidden bg-[#f9f9ff] dark:bg-slate-900 ${isDarkMode ? 'dark' : ''} select-none`}>
      
      {/* Toast Notification Banner */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-lg border text-xs font-bold flex items-center gap-2 animate-bounce ${
          toast.type === 'success' ? 'bg-[#7cf994] text-[#007230] border-[#62df7d]' :
          toast.type === 'error' ? 'bg-[#ffdad6] text-[#ba1a1a] border-[#ffdad6]' :
          'bg-[#dee8ff] text-[#004ac6] border-[#004ac6]/10'
        }`}>
          <span className="material-symbols-outlined text-base">
            {toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info'}
          </span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Custom App Bar matching specs */}
      <div className="w-full flex justify-between items-center px-6 py-2 bg-[#f9f9ff] dark:bg-slate-900 text-[#111c2d] dark:text-white shrink-0 border-b border-[#cbd5e1]/10">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-[#dee8ff] dark:bg-slate-800 border border-blue-500/20 flex items-center justify-center overflow-hidden">
            <span className="material-symbols-outlined text-[#004ac6] dark:text-[#7cf994] text-xl font-bold">medical_services</span>
          </div>
          <h1 className="text-base font-bold text-[#004ac6] dark:text-[#7cf994] font-sans">MedLink IoT</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            setCurrentScreen('logs-list');
            showToast('History logs opened.');
          }}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
        >
          <span className="material-symbols-outlined text-xl text-[#004ac6] dark:text-white">notifications</span>
        </button>
      </div>

      {/* Handheld Scrollable Viewport Canvas */}
      <main className="flex-1 overflow-y-auto px-5 py-4 pb-24 scrollbar-none scroll-smooth">
        {renderScreenContent()}
      </main>

      {/* Handheld Mobile Navigation Tab Bar */}
      <nav className="absolute bottom-0 left-0 w-full h-[64px] bg-[#e7eeff] dark:bg-slate-900 border-t border-[#cbd5e1]/20 flex justify-around items-center px-3 pb-safe z-40 select-none shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
        <button
          type="button"
          onClick={() => {
            setCurrentScreen('home');
            setSelectedMedicineId(null);
          }}
          className={getTabClass('home')}
        >
          <span className="material-symbols-outlined text-lg">dashboard</span>
          <span className="text-[9px] font-semibold tracking-wider uppercase mt-0.5">Home</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setCurrentScreen('medicines');
            setSelectedMedicineId(null);
          }}
          className={getTabClass('medicines')}
        >
          <span className="material-symbols-outlined text-lg">medication</span>
          <span className="text-[9px] font-semibold tracking-wider uppercase mt-0.5">Medicines</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setCurrentScreen('diagnostics');
            setSelectedMedicineId(null);
          }}
          className={getTabClass('diagnostics')}
        >
          <span className="material-symbols-outlined text-lg">medical_services</span>
          <span className="text-[9px] font-semibold tracking-wider uppercase mt-0.5">Diagnostics</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setCurrentScreen('settings');
            setSelectedMedicineId(null);
          }}
          className={getTabClass('settings')}
        >
          <span className="material-symbols-outlined text-lg">settings</span>
          <span className="text-[9px] font-semibold tracking-wider uppercase mt-0.5">Settings</span>
        </button>
      </nav>
    </div>
  );
}
