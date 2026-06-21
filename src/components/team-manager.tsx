'use client';

import { useActionState } from 'react';

import { changeRole, inviteColleague } from '@/app/actions/team';
import { type Staff } from '@/domain/staff';
import { idleFormState } from '@/lib/forms';
import { ROLES, roleLabel } from '@/lib/permissions';

import { FieldError, FormFeedback } from './form-feedback';
import { SubmitButton } from './submit-button';

function RoleForm({ member }: { member: Staff }) {
  const [state, action] = useActionState(changeRole, idleFormState);
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="staffId" value={member.id} />
      <select
        name="role"
        defaultValue={member.role}
        className="input min-h-0 w-auto py-1.5 text-sm"
        aria-label={`Role for ${member.name}`}
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {roleLabel(r)}
          </option>
        ))}
      </select>
      <SubmitButton className="min-h-0 px-3 py-1.5 text-xs" pendingText="…">
        Update
      </SubmitButton>
      {state.status === 'error' ? <span className="text-xs text-debt">{state.message}</span> : null}
      {state.status === 'success' ? <span className="text-xs text-settled">Saved</span> : null}
    </form>
  );
}

function InviteForm() {
  const [state, action] = useActionState(inviteColleague, idleFormState);
  const fieldErrors = state.status === 'error' ? state.fieldErrors : undefined;
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="invite-name">
            Name
          </label>
          <input id="invite-name" name="name" className="input" placeholder="Colleague name" />
          <FieldError message={fieldErrors?.name} />
        </div>
        <div>
          <label className="label" htmlFor="invite-email">
            Email
          </label>
          <input
            id="invite-email"
            name="email"
            type="email"
            className="input"
            placeholder="name@email.com"
          />
          <FieldError message={fieldErrors?.email} />
        </div>
      </div>
      <FormFeedback state={state} />
      <SubmitButton>Send invite</SubmitButton>
    </form>
  );
}

export function TeamManager({
  currentStaffId,
  members,
}: {
  currentStaffId: string;
  members: Staff[];
}) {
  return (
    <div className="space-y-8">
      <div className="card divide-y divide-line">
        {members.map((member) => (
          <div key={member.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">
                {member.name}
                {member.id === currentStaffId ? (
                  <span className="text-ink-faint"> (you)</span>
                ) : null}
              </p>
              <p className="text-xs text-ink-faint">{roleLabel(member.role)}</p>
            </div>
            <RoleForm member={member} />
          </div>
        ))}
      </div>

      <section>
        <h2 className="mb-1 text-lg font-semibold text-ink">Invite a colleague</h2>
        <p className="mb-3 text-sm text-ink-muted">
          New colleagues join as employees; promote them above when they sign up.
        </p>
        <InviteForm />
      </section>
    </div>
  );
}
