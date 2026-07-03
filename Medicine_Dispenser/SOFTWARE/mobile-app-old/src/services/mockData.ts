import { DashboardSummary } from '../models/DashboardSummary';
import { Medicine } from '../models/Medicine';

export const mockDashboardSummary: DashboardSummary = {
  deviceStatus: 'Connected',
  todaysDoses: 3,
  remainingMedicines: 74,
  nextDose: '8:00 PM',
};

export const mockMedicines: Medicine[] = [
  {
    id: 'vitamin-c',
    name: 'Vitamin C',
    remainingPills: 28,
  },
  {
    id: 'calcium',
    name: 'Calcium',
    remainingPills: 18,
  },
  {
    id: 'omega-3',
    name: 'Omega 3',
    remainingPills: 28,
  },
];

export const mockDiagnosticTests = [
  'Test Dispenser 1',
  'Test Dispenser 2',
  'Test Dispenser 3',
  'Speaker Test',
  'RTC Test',
  'WiFi Test',
  'IR Test',
] as const;
