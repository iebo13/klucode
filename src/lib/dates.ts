// Date formatting for display. Used only in Server Components, so there is no
// server/client hydration mismatch to worry about.

const DATE_TIME = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const WEEKDAY = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

export function formatDateTime(iso: string): string {
  return DATE_TIME.format(new Date(iso));
}

export function formatWeekday(iso: string): string {
  // Date-only strings ("2026-06-21") parse as UTC midnight; anchor at noon so
  // the weekday doesn't slip a day in negative-offset time zones.
  const value = iso.length === 10 ? `${iso}T12:00:00` : iso;
  return WEEKDAY.format(new Date(value));
}
