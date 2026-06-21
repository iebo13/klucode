// Minimal, correct CSV serialisation (RFC 4180): quote fields containing a
// comma, quote, or newline, and double up embedded quotes. Used by the owner
// export. One implementation, reused (§11 DRY).

function escapeField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(headers: readonly string[], rows: readonly (readonly string[])[]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeField).join(','));
  return lines.join('\r\n');
}
