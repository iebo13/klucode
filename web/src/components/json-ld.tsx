/**
 * Renders a JSON-LD script tag. Server component — the data is baked into the
 * static HTML, which is exactly where crawlers want it.
 *
 * `<` is escaped so content strings can never close the script element and
 * inject markup (the standard JSON-in-HTML precaution).
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
