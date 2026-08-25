'use client';

import { useState } from 'react';

import type { Content } from '@/content';
import { profile } from '@/content/profile';

/**
 * 'handoff' is not 'sent'. The mailto path assigns window.location.href and the
 * browser either opens a mail client or does nothing at all — we never learn
 * which, and on a device with no client configured the visitor is left staring
 * at a page that claimed to have sent something. The two outcomes therefore get
 * two states and two pieces of copy — and the form stays rendered through the
 * hand-off, so a visitor whose mail client never opened still has their typed
 * message in front of them instead of losing it to a success screen.
 */
type Status = 'idle' | 'sending' | 'sent' | 'handoff' | 'failed';
type FieldKey = 'name' | 'email' | 'message' | 'consent';
type Errors = Partial<Record<FieldKey, string>>;

/** Validation order — also the focus order after a failed submit. */
const FIELD_ORDER: FieldKey[] = ['name', 'email', 'message', 'consent'];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Flat, like every other content surface. A form field is the last place that
// should gamble its legibility on what happens to be behind it.
const field =
  'w-full rounded-md border border-line bg-surface-raised px-4 py-3 text-body outline-none transition-colors duration-base placeholder:text-muted/70 focus:border-brand-action';

/**
 * On a static site there is no server to post to. Rather than quietly routing
 * the visitor's message through a third-party form service — which would mean a
 * new processor to disclose in the privacy policy — the default path opens the
 * visitor's own mail client with the message prepared. They can see exactly what
 * is sent and to whom.
 *
 * This is a decision, not a stopgap (issue #11): the cost is that a device with
 * no configured mail client reaches a dead end, which is why the contact page
 * puts the address and phone number above the form and why the hand-off state
 * below repeats the address in selectable text rather than claiming success.
 *
 * Set profile.formEndpoint to switch to a real POST (deploy/contact.php is a
 * ready-made first-party handler for the Plesk server, if server-side sending
 * is ever wanted without a third-party processor); update the privacy policy
 * in the same change.
 *
 * Props are the contact strings only, not the whole Content object: client
 * component props are serialized into every page's HTML, and this component
 * once dragged the full Impressum and Datenschutzerklärung into the homepage
 * payload that way.
 */
export function ContactForm({ t, siteName }: { t: Content['contact']; siteName: string }) {
  const [status, setStatus] = useState<Status>('idle');
  const [errors, setErrors] = useState<Errors>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get('name') ?? '').trim();
    const email = String(data.get('email') ?? '').trim();
    const company = String(data.get('company') ?? '').trim();
    const message = String(data.get('message') ?? '').trim();
    const consent = data.get('consent') === 'on';
    // The honeypot, forwarded rather than checked here. Deciding on the client
    // tells a bot which field gave it away; the handler can just say 200 and
    // drop the message.
    const website = String(data.get('website') ?? '').trim();

    const next: Errors = {};
    if (!name) next.name = t.errorRequired;
    if (!email) next.email = t.errorRequired;
    else if (!EMAIL.test(email)) next.email = t.errorEmail;
    if (!message) next.message = t.errorRequired;
    if (!consent) next.consent = t.errorRequired;

    setErrors(next);
    const firstInvalid = FIELD_ORDER.find((k) => next[k]);
    if (firstInvalid) {
      // By id from the freshly computed error set — not by querying
      // [aria-invalid], which reads the previous render's DOM and therefore
      // finds nothing on the first failed submit.
      document.getElementById(firstInvalid)?.focus();
      return;
    }

    if (!profile.formEndpoint) {
      const subject = encodeURIComponent(`${siteName} — ${name}`);
      const body = encodeURIComponent([name, company, email, '', message].join('\n'));
      window.location.href = `mailto:${profile.email}?subject=${subject}&body=${body}`;
      setStatus('handoff');
      return;
    }

    setStatus('sending');
    try {
      const res = await fetch(profile.formEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, company, message, website }),
      });
      setStatus(res.ok ? 'sent' : 'failed');
      if (res.ok) form.reset();
    } catch {
      setStatus('failed');
    }
  }

  if (status === 'sent') {
    return (
      <p role="status" className="panel p-6 text-body md:p-8">
        {t.sent}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="name" label={t.fields.name} error={errors.name}>
          <input
            id="name"
            name="name"
            autoComplete="name"
            required
            aria-required="true"
            className={field}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'name-error' : undefined}
          />
        </Field>
        <Field id="email" label={t.fields.email} error={errors.email}>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-required="true"
            className={field}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
        </Field>
      </div>

      <Field id="company" label={t.fields.company}>
        <input id="company" name="company" autoComplete="organization" className={field} />
      </Field>

      {/* The honeypot. A real input, positioned off-screen rather than hidden
          with display:none, because some bots skip what is not rendered. A
          person never reaches it: it is out of the tab order, hidden from the
          accessibility tree, and autofill is switched off so a browser does not
          helpfully put a URL in it. Anything that arrives with this filled is
          answered 200 and silently dropped by the handler, because a bot told
          it failed comes back without the field. */}
      <div aria-hidden="true" className="pointer-events-none absolute left-[-9999px] h-px w-px">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <Field id="message" label={t.fields.message} error={errors.message}>
        <textarea
          id="message"
          name="message"
          rows={6}
          placeholder={t.fields.messagePlaceholder}
          required
          aria-required="true"
          className={`${field} resize-y`}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? 'message-error' : undefined}
        />
      </Field>

      <div>
        <label className="flex cursor-pointer items-start gap-3 text-small text-muted">
          <input
            id="consent"
            type="checkbox"
            name="consent"
            required
            aria-required="true"
            className="mt-1 h-4 w-4 shrink-0 accent-[--kc-brandAction]"
            aria-invalid={!!errors.consent}
            aria-describedby={errors.consent ? 'consent-error' : undefined}
          />
          <span>{t.consent}</span>
        </label>
        {errors.consent ? (
          <p id="consent-error" className="mt-2 text-small text-danger">
            {errors.consent}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={status === 'sending'}
        className="inline-flex items-center justify-center rounded-md bg-brand-action px-6 py-3 font-display font-medium text-on-brand transition-colors duration-base hover:bg-viridian-700 disabled:opacity-60"
      >
        {status === 'sending' ? t.submitting : t.submit}
      </button>

      {status === 'handoff' ? (
        <div role="status" className="panel p-6 md:p-8">
          <h3 className="font-display text-h3">{t.handoffTitle}</h3>
          <p className="mt-3 max-w-measure text-muted">{t.handoffBody}</p>
          {/* Selectable plain text, not just a second mailto — a visitor whose
              device has no mail client cannot use another mailto link either. */}
          <a
            href={`mailto:${profile.email}`}
            className="mt-4 inline-block select-all font-display text-h3 text-brand-text underline decoration-viridian-300 underline-offset-4"
          >
            {profile.email}
          </a>
        </div>
      ) : null}

      {status === 'failed' ? (
        <p role="alert" className="text-small text-danger">
          {t.failed} <a href={`mailto:${profile.email}`}>{profile.email}</a>
        </p>
      ) : null}

      {/* Which note is true depends on which path this build takes, so it is
          read off the same value the submit handler branches on rather than
          assumed. Production posts to the first-party handler, previews hand
          off to the visitor's mail client, and telling someone their message
          went to a server when it opened their mail client instead is a
          statement about their data, not a wording preference. */}
      <p className="max-w-measure text-small text-muted">
        {profile.formEndpoint ? t.postNote : t.mailtoNote}
      </p>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-small font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-2 text-small text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
