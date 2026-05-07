import { startOfDay, parseISO } from 'date-fns';

/**
 * Parses a string in "YYYY-MM-DD" or ISO format into a Date object at local midnight.
 */
export function parseDateLocal(dateStr: string): Date {
  if (!dateStr) return new Date();
  
  // If it's just YYYY-MM-DD, parse as local manually to avoid UTC shift
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  
  return startOfDay(parseISO(dateStr));
}
