import { format, parseISO, isValid } from 'date-fns';

// IST timezone offset: UTC+5:30
const IST_OFFSET = 5.5 * 60 * 60 * 1000;

/**
 * Format a date string to display format (DD MMM YYYY)
 */
export const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString) return '-';
  
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return '-';
    return format(date, 'dd MMM yyyy');
  } catch {
    return '-';
  }
};

/**
 * Format a date string to full format (DD MMM YYYY, HH:mm)
 */
export const formatDateTime = (dateString: string | undefined | null): string => {
  if (!dateString) return '-';
  
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return '-';
    return format(date, 'dd MMM yyyy, HH:mm');
  } catch {
    return '-';
  }
};

/**
 * Format date for API payload (YYYY-MM-DD)
 */
export const formatDateForApi = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

/**
 * Get current date in IST as YYYY-MM-DD
 */
export const getTodayIST = (): string => {
  const now = new Date();
  const istTime = new Date(now.getTime() + IST_OFFSET);
  return istTime.toISOString().split('T')[0];
};

/**
 * Parse ISO string to Date object
 */
export const parseDate = (dateString: string): Date | null => {
  try {
    const date = parseISO(dateString);
    return isValid(date) ? date : null;
  } catch {
    return null;
  }
};
