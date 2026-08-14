/**
 * Emits a JSON-LD block.
 *
 * A server component on purpose. Rendering structured data from a client
 * component makes React re-inject the script on hydration, which is how a page
 * ends up with the same graph twice — and it also ships the whole graph in the
 * RSC payload for no reason. Nothing here is interactive, so nothing here needs
 * to be.
 *
 * `<` is escaped because a copy string containing `</script>` would otherwise
 * close the tag and turn the rest of the graph into markup. JSON.stringify does
 * not do this for you.
 */

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}
