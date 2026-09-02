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

// §4 reports default to the current Bangkok month.
export function currentMonthRange(): { from: string; to: string } {
  const today = bangkokToday();
  const [y, m] = today.split('-').map(Number);
  const from = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const to = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

// Whole days between a YYYY-MM-DD opened date and today, Bangkok-local.
export function daysSince(date: string): number {
  const start = new Date(`${date}T00:00:00Z`).getTime();
  const today = new Date(`${bangkokToday()}T00:00:00Z`).getTime();
  return Math.floor((today - start) / (24 * 60 * 60 * 1000));
}
