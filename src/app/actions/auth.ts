'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { type FormState, fieldErrorsFrom } from '@/lib/forms';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const credentialsSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signUpSchema = credentialsSchema.extend({
  name: z.string().trim().min(1, 'Your name is required').max(80),
});

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Please check your details.',
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { status: 'error', message: 'Those credentials did not match. Please try again.' };
  }

  redirect('/dashboard');
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Please check your details.',
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { name: parsed.data.name } },
  });
  if (error) {
    return { status: 'error', message: error.message };
  }

  // When email confirmation is required there is no session yet.
  if (!data.session) {
    return {
      status: 'success',
      message: 'Account created. Check your email to confirm, then sign in.',
    };
  }

  redirect('/dashboard');
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}
