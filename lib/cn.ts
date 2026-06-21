/** Join truthy class names. A tiny stand-in for clsx — no dependency needed. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
