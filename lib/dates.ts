// §2: "All timestamps timestamptz, stored UTC, displayed Asia/Bangkok."
// opened_date/log_date are plain dates, but "today" still has to mean
// today in Bangkok, not the server's UTC day.
const BANGKOK_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Bangkok',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// Returns YYYY-MM-DD for "today" in Asia/Bangkok.
export function bangkokToday(): string {
  return BANGKOK_FORMATTER.format(new Date()); // en-CA locale formats as YYYY-MM-DD
}

const THAI_DATE_FORMATTER = new Intl.DateTimeFormat('th-TH-u-ca-gregory', {
  timeZone: 'Asia/Bangkok',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

// Formats a YYYY-MM-DD (or Date) for display, Thai locale, Gregorian
// calendar (§2 dates are already CE — don't let Intl switch to Buddhist era).
export function formatThaiDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(`${date}T00:00:00Z`) : date;
  return THAI_DATE_FORMATTER.format(d);
}
