'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * „Die Ausgangslage": three options that do not fit, then the one that does.
 *
 * It was a paper section, then it was the first act of the crossroads, and it
 * is a paper section again. The merge was worth trying and the reason it is
 * undone is written down rather than reversed quietly: pinned, this argument
 * cost 122svh of scroll during which the picture was a slow dolly towards four
 * wireframes while the words were about agencies, website kits and Excel, none
 * of which was in the scene. The experiment that put them in it is issue #18,
 * and it returned a measured no. See the note at the top of progress.ts.
 *
 * What the section keeps from that pass is the part that worked. Each option
 * fails as you leave it: read at full strength, then settling back with a rule
 * drawn part of the way across its heading, until three struck options stand
 * above the answer. That ran in the fallback only, which is to say it ran for
 * most visitors and not for the ones on a laptop. Unpinned, it runs for
 * everyone.
 *
 * ONLY the list is a client component, which is why the heading and the answer
 * panel arrive as props and children rather than being rendered here. This
 * file is 'use client', so anything it imports is in the page's eager bundle
 * for every visitor: the first draft pulled Section, SectionHead and InkPanel
 * across that line and put half a kilobyte of server-rendered layout into
 * First Load JS to run one IntersectionObserver.
 */
export function ProblemOptions({
  cards,
  children,
}: {
  cards: readonly { title: string; body: string }[];
  /** The answer panel, rendered on the server and observed as the last block. */
  children: ReactNode;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  /**
   * The furthest block that has reached the reading line, and it only ever
   * grows: these are read in order, and an option that failed does not un-fail
   * because the reader scrolled back up to check it.
   */
  const [active, setActive] = useState(0);

  useEffect(() => {
    // A reduced-motion request is honoured by not moving anything, which here
    // means every option stays at full strength and nothing is ever struck
    // through. That is the same answer the scene's mount predicate gives, for
    // the same reason.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const list = listRef.current;
    if (!list) return;

    const blocks = Array.from(list.querySelectorAll<HTMLElement>('[data-block]'));
    if (blocks.length === 0) return;

    /**
     * Measured across every block rather than read off the observer's entries,
     * and that is the whole point of the shape. An entry only arrives for a
     * block that crossed the boundary, so a scroll that JUMPS, which is an
     * anchor link, a restored offset, the End key, or a browser returning you
     * to where you were, hands over a callback naming one block and says
     * nothing about the three it flew past. Measured, they are simply behind
     * the line, and behind the line is the only thing being asked.
     *
     * The line sits 65% down the viewport rather than at its foot, because a
     * tall phone shows two of these at once and a block is not read the
     * instant its first pixel appears.
     */
    const measure = () => {
      const line = window.innerHeight * 0.65;
      let highest = 0;
      blocks.forEach((el, i) => {
        if (el.getBoundingClientRect().top < line) highest = i;
      });
      setActive((was) => (highest > was ? highest : was));
    };

    // The observer is the cheap trigger, not the measurement: it fires when any
    // block crosses the band, which is exactly when the answer can change, and
    // costs nothing on the frames in between.
    const io = new IntersectionObserver(measure, {
      rootMargin: '-35% 0px -30% 0px',
      threshold: 0,
    });

    for (const el of blocks) io.observe(el);
    // Once at mount, for the reader who arrives already scrolled down.
    measure();
    return () => io.disconnect();
  }, []);

  return (
    <div ref={listRef} className="mt-8 divide-y divide-line border-y border-line md:mt-12">
      {cards.map((card, i) => (
        <div
          key={card.title}
          data-block
          data-passed={active > i}
          className="problem-option grid gap-2 py-6 md:grid-cols-12 md:gap-8 md:py-8"
        >
          <h3 className="text-h3 md:col-span-4">
            {/* The span is what carries the strike, and it has to be a span.
                The h3 is a grid item, so an inline-block on it is blockified
                and stretched to the row: 84px tall against 31px of text, with
                the rule landing under the paragraph beside it rather than
                through the heading. */}
            <span className="problem-strike">{card.title}</span>
          </h3>
          <p className="max-w-measure text-muted md:col-span-8">{card.body}</p>
        </div>
      ))}
      {/* The answer is a block for the observer's purposes and a panel for the
          reader's. It is what strikes the third option through: an option is
          only marked once the NEXT block has been reached, and without this the
          last of the three never would be. */}
      <div data-block className="border-b-0 pb-0">
        {children}
      </div>
    </div>
  );
}
