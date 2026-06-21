import { type Metadata } from 'next';

import { SignInForm } from '@/components/sign-in-form';

export const metadata: Metadata = { title: 'Sign in · CafeTab' };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-ink text-lg font-bold text-white">
            ₵
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">CafeTab</h1>
          <p className="mt-1 text-sm text-ink-muted">The shared tab, kept honest.</p>
        </div>
        <div className="card p-6">
          <SignInForm />
        </div>
      </div>
    </main>
  );
}
