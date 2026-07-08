import { Medicine } from '../types';

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

export function getDayName(timestamp: number): string {
  const d = new Date(timestamp);
  return DAYS_OF_WEEK[d.getDay()];
}

export function isMedicineActiveOnDay(med: Medicine, timestamp: number): boolean {
  if (!med.enabled || med.remainingPills <= 0) return false;
  const pattern = med.repeatPattern;
  if (!pattern || pattern === 'Daily') return true;
  
  const dayName = getDayName(timestamp);
  if (pattern === 'Weekdays') {
    return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(dayName);
  }
  
  // Custom: comma-separated list of weekdays, e.g. "Monday, Wednesday, Friday"
  const activeDays = pattern.split(',').map(s => s.trim().toLowerCase());
  return activeDays.includes(dayName.toLowerCase());
}
