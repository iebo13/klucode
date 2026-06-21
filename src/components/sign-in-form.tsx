'use client';

import { useActionState, useState } from 'react';

import { signIn, signUp } from '@/app/actions/auth';
import { idleFormState } from '@/lib/forms';

import { FieldError, FormFeedback } from './form-feedback';
import { SubmitButton } from './submit-button';

export function SignInForm() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [state, action] = useActionState(mode === 'signin' ? signIn : signUp, idleFormState);
  const fieldErrors = state.status === 'error' ? state.fieldErrors : undefined;

  return (
    <div>
      <form action={action} className="space-y-4">
        {mode === 'signup' ? (
          <div>
            <label className="label" htmlFor="name">
              Your name
            </label>
            <input
              id="name"
              name="name"
              className="input"
              placeholder="Your name"
              autoComplete="name"
            />
            <FieldError message={fieldErrors?.name} />
          </div>
        ) : null}

        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className="input"
            placeholder="you@cafe.com"
          />
          <FieldError message={fieldErrors?.email} />
        </div>

        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            className="input"
            placeholder="••••••••"
          />
          <FieldError message={fieldErrors?.password} />
        </div>

        <FormFeedback state={state} />

        <SubmitButton className="w-full" pendingText="Please wait…">
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </SubmitButton>
      </form>

      <p className="mt-4 text-center text-sm text-ink-muted">
        {mode === 'signin' ? 'First time here?' : 'Already have an account?'}{' '}
        <button
          type="button"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          className="font-medium text-ink underline"
        >
          {mode === 'signin' ? 'Create an account' : 'Sign in'}
        </button>
      </p>
    </div>
  );
}
