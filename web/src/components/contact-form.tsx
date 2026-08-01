'use client';

import { useState } from 'react';

import type { Content } from '@/content';
import { profile } from '@/content/profile';

type Status = 'idle' | 'sending' | 'sent' | 'failed';
type Errors = Partial<Record<'name' | 'email' | 'message' | 'consent', string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const field =
  'glass-solid w-full rounded-md px-4 py-3 text-body outline-none transition-colors duration-base placeholder:text-muted/70 focus:border-brand-action';

/**
 * On a static site there is no server to post to. Rather than quietly routing
 * the visitor's message through a third-party form service — which would mean a
 * new processor to disclose in the privacy policy — the default path opens the
 * visitor's own mail client with the message prepared. They can see exactly what
 * is sent and to whom.
 *
 * Set profile.formEndpoint to switch to a real POST; remember to update the
 * privacy policy at the same time.
 */
export function ContactForm({ c }: { c: Content }) {
  const t = c.contact;
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
    if (Object.keys(next).length > 0) {
      form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }

    const bodyLines = [name, company, email, '', message].filter((l) => l !== undefined);

    if (!profile.formEndpoint) {
      const subject = encodeURIComponent(`${c.meta.siteName} — ${name}`);
      const body = encodeURIComponent(bodyLines.join('\n'));
      window.location.href = `mailto:${profile.email}?subject=${subject}&body=${body}`;
      setStatus('sent');
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
      <p role="status" className="glass rounded-glass border-brand p-7 text-body">
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
            className={field}
            aria-invalid={!!errors.name}
          />
        </Field>
        <Field id="email" label={t.fields.email} error={errors.email}>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className={field}
            aria-invalid={!!errors.email}
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
          className={`${field} resize-y`}
          aria-invalid={!!errors.message}
        />
      </Field>

      <div>
        <label className="flex cursor-pointer items-start gap-3 text-small text-muted">
          <input
            type="checkbox"
            name="consent"
            className="mt-1 h-4 w-4 shrink-0 accent-[--kc-brandAction]"
            aria-invalid={!!errors.consent}
          />
          <span>{t.consent}</span>
        </label>
        {errors.consent ? <p className="mt-1.5 text-small text-danger">{errors.consent}</p> : null}
      </div>

      <button
        type="submit"
        disabled={status === 'sending'}
        className="inline-flex items-center justify-center rounded-md bg-brand-action px-6 py-3.5 font-display font-medium text-on-brand transition-colors duration-base hover:bg-viridian-700 disabled:opacity-60"
      >
        {status === 'sending' ? t.submitting : t.submit}
      </button>

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
      {error ? <p className="mt-1.5 text-small text-danger">{error}</p> : null}
    </div>
  );
}
