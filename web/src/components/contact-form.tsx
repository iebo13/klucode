'use client';

import { useState } from 'react';

import type { Content } from '@/content';
import { profile } from '@/content/profile';

type Status = 'idle' | 'sending' | 'sent' | 'mailto-opened' | 'failed';
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
 * Set profile.formEndpoint to switch to a real POST (deploy/contact.php is a
 * ready-made first-party handler for the Plesk server); remember to update the
 * privacy policy at the same time.
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
      // NOT 'sent': nothing has left this machine. The visitor still has to
      // press send in their mail client — and on a machine with no mail
      // handler nothing opened at all. The form stays rendered either way,
      // so the typed message cannot be silently lost.
      setStatus('mailto-opened');
      return;
    }

    setStatus('sending');
    try {
      const res = await fetch(profile.formEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, company, message }),
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

      {status === 'mailto-opened' ? (
        <p role="status" className="panel max-w-measure p-4 text-small">
          {t.mailtoOpened} <a href={`mailto:${profile.email}`}>{profile.email}</a>
        </p>
      ) : null}

      {status === 'failed' ? (
        <p role="alert" className="text-small text-danger">
          {t.failed} <a href={`mailto:${profile.email}`}>{profile.email}</a>
        </p>
      ) : null}

      <p className="max-w-measure text-small text-muted">{t.mailtoNote}</p>
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
