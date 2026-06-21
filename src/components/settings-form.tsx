'use client';

import { useActionState } from 'react';

import { updateSettings } from '@/app/actions/settings';
import { type CafeSettings } from '@/domain/settings';
import { idleFormState } from '@/lib/forms';

import { FieldError, FormFeedback } from './form-feedback';
import { SubmitButton } from './submit-button';

const TIME_ZONES = [
  'Europe/Madrid',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Lisbon',
  'UTC',
];

export function SettingsForm({ settings, canEdit }: { settings: CafeSettings; canEdit: boolean }) {
  const [state, action] = useActionState(updateSettings, idleFormState);
  const fieldErrors = state.status === 'error' ? state.fieldErrors : undefined;
  const thresholdEuros = (settings.alertThresholdCents / 100).toFixed(2);
  const zones = Array.from(new Set([settings.timeZone, ...TIME_ZONES]));

  return (
    <form action={action} className="space-y-5">
      <div>
        <label className="label" htmlFor="cafeName">
          Café name
        </label>
        <input
          id="cafeName"
          name="cafeName"
          className="input"
          defaultValue={settings.cafeName}
          disabled={!canEdit}
          maxLength={80}
        />
        <FieldError message={fieldErrors?.cafeName} />
      </div>

      <div>
        <label className="label" htmlFor="currency">
          Currency
        </label>
        <input id="currency" className="input" value="EUR (€)" disabled readOnly />
        <p className="mt-1 text-xs text-ink-faint">Fixed to EUR.</p>
      </div>

      <div>
        <label className="label" htmlFor="timeZone">
          Time zone
        </label>
        <select
          id="timeZone"
          name="timeZone"
          className="input"
          defaultValue={settings.timeZone}
          disabled={!canEdit}
        >
          {zones.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
        <FieldError message={fieldErrors?.timeZone} />
      </div>

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          name="alertEnabled"
          defaultChecked={settings.alertEnabled}
          disabled={!canEdit}
          className="h-5 w-5 rounded border-line"
        />
        <span className="text-sm font-medium text-ink">Flag tabs over the threshold</span>
      </label>

      <div>
        <label className="label" htmlFor="alertThresholdEuros">
          Alert threshold (€)
        </label>
        <input
          id="alertThresholdEuros"
          name="alertThresholdEuros"
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          className="input"
          defaultValue={thresholdEuros}
          disabled={!canEdit}
        />
        <FieldError message={fieldErrors?.alertThresholdCents} />
      </div>

      <p className="rounded-lg bg-paper px-3 py-2 text-xs text-ink-muted">
        Balances are always derived from events, never stored.
      </p>

      <FormFeedback state={state} />

      {canEdit ? (
        <SubmitButton>Save settings</SubmitButton>
      ) : (
        <p className="text-sm text-ink-faint">Only the owner can change settings.</p>
      )}
    </form>
  );
}
