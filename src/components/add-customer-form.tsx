'use client';

import { useActionState } from 'react';

import { addCustomer } from '@/app/actions/customers';
import { idleFormState } from '@/lib/forms';

import { FieldError, FormFeedback } from './form-feedback';
import { SubmitButton } from './submit-button';

export function AddCustomerForm() {
  const [state, action] = useActionState(addCustomer, idleFormState);
  const fieldErrors = state.status === 'error' ? state.fieldErrors : undefined;

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="name">
          Name
        </label>
        <input
          id="name"
          name="name"
          className="input"
          placeholder="Customer name"
          required
          maxLength={120}
        />
        <FieldError message={fieldErrors?.name} />
      </div>
      <div>
        <label className="label" htmlFor="phone">
          Phone (optional)
        </label>
        <input
          id="phone"
          name="phone"
          className="input"
          placeholder="+34 600 000 000"
          inputMode="tel"
          maxLength={40}
        />
        <FieldError message={fieldErrors?.phone} />
      </div>
      <FormFeedback state={state} />
      <SubmitButton className="w-full">Add customer</SubmitButton>
    </form>
  );
}
