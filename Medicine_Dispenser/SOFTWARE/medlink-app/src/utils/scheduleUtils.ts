import { Medicine } from '../types';

/**
 * Checks if a medicine is scheduled to be active on the weekday of the given timestamp.
 */
export function isMedicineActiveOnDay(med: Medicine, timestamp: number): boolean {
  if (!med.repeatPattern || med.repeatPattern === 'Daily') {
    return true;
  }
  
  const date = new Date(timestamp);
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDayName = weekdays[date.getDay()];
  
  return med.repeatPattern.split(',').map(d => d.trim().toLowerCase()).includes(currentDayName.toLowerCase());
}
