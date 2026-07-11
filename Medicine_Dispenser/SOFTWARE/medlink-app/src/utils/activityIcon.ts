export function activityIcon(type: string): { icon: string; color: string } {
  switch (type) {
    case 'dispensed':
      return { icon: 'check_circle',       color: 'text-emerald-500' };
    case 'reminder':
      return { icon: 'notifications',      color: 'text-teal-500' };
    case 'missed':
      return { icon: 'cancel',             color: 'text-rose-500' };
    case 'low_stock':
      return { icon: 'warning',            color: 'text-amber-500' };
    case 'refill':
      return { icon: 'inventory_2',        color: 'text-sky-500' };
    case 'connection':
      return { icon: 'wifi',               color: 'text-slate-400' };
    case 'medicine_assign':
      return { icon: 'medication',         color: 'text-violet-500' };
    case 'medicine_removed':
      return { icon: 'delete',             color: 'text-rose-400' };
    case 'setting_change':
      return { icon: 'tune',               color: 'text-indigo-500' };
    default:
      return { icon: 'info',               color: 'text-slate-400' };
  }
}
