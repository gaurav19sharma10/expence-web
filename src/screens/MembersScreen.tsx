import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { VectorIcon } from '../components/vector/VectorIcons';
import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { SkeletonMemberRows } from '../components/ui/Skeleton';

/**
 * Who is in the family, and the code that lets somebody else in.
 *
 * The invite code is shown to the owner only, because a non-member who obtains
 * it can join — which is the entire purpose of the field.
 */
export function MembersScreen() {
  const { user, profile } = useAuth();
  const { household, members, activity, leaveHousehold, error, loading } = useHousehold();
  const [copied, setCopied] = useState<string | null>(null);

  const ownerUid = household?.ownerUid;
  const isOwner = ownerUid === user?.uid;
  const inviteCode = household?.inviteCode;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard is unavailable on some mobile browsers over plain http; the
      // code is already on screen, so there is nothing to recover.
    }
  };

  const share = async () => {
    if (!inviteCode || !household?.name) return;
    const text = `Join "${household.name}" on Expence with code ${inviteCode}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: household.name, text });
        return;
      } catch {
        // Cancelled, or unsupported: fall through to copying.
      }
    }
    await copy(text);
  };

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-xl border border-negative/30 bg-negative/10 px-3 py-2.5 text-xs font-medium text-negative">
          {error}
        </div>
      )}

      <section className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-faint">
              Household
            </span>
            <h2 className="mt-0.5 text-xl font-bold tracking-tight text-body">
              {household?.name || 'Your family'}
            </h2>
            <p className="mt-0.5 text-xs font-medium text-muted">
              {members.length} member{members.length === 1 ? '' : 's'} ·{' '}
              {household?.baseCurrency || 'INR'}
            </p>
          </div>
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-light text-brand">
            <VectorIcon name="users" size={20} />
          </span>
        </div>

        {isOwner && inviteCode && (
          <div className="mt-4 rounded-2xl border border-brand/25 bg-brand-light p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-brand">
              Invite code
            </p>
            <p className="mt-1 font-mono text-2xl font-bold tracking-[0.2em] text-brand">
              {inviteCode}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <SmallButton onClick={() => void copy(inviteCode)}>
                <VectorIcon name="copy" size={13} />
                {copied === inviteCode ? 'Copied' : 'Copy code'}
              </SmallButton>
              <SmallButton onClick={() => void share()}>
                <VectorIcon name="share" size={13} />
                Share
              </SmallButton>
            </div>
          </div>
        )}

        {!isOwner && inviteCode && (
          <p className="mt-4 text-xs text-muted">
            Only the family owner can see the invite code.
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
        <div className="border-b border-line px-5 py-3.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-faint">
            Members
          </span>
        </div>

        <div>
          {loading && members.length === 0 ? (
            <SkeletonMemberRows count={3} />
          ) : (
          members.map((m: any, i: number) => (
            <div
              key={m.uid}
              className={`flex items-center gap-3 px-5 py-3.5 ${i > 0 ? 'border-t border-line' : ''}`}
            >
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                  m.uid === user?.uid ? 'bg-brand' : 'bg-muted'
                }`}
              >
                {(m.displayName || m.email || '?').slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-body">
                  {m.displayName || m.email}
                  {m.uid === user?.uid && (
                    <span className="ml-1.5 text-[10px] font-bold text-faint">YOU</span>
                  )}
                </p>
                <p className="truncate text-[11px] text-muted">{m.email}</p>
              </div>
              {String(m.role).toUpperCase() === 'OWNER' && (
                <span className="shrink-0 rounded-full bg-brand-light px-2.5 py-1 text-[10px] font-bold text-brand">
                  Owner
                </span>
              )}
            </div>
          )))}
        </div>

        <div className="border-t border-line px-5 py-3.5">
          <p className="text-[11px] font-medium text-muted">
            Joining with a code adds you as a member. Every member can log expenses
            for the whole family.
          </p>
        </div>
      </section>

      {activity.length > 0 && (
        <section className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
          <div className="border-b border-line px-5 py-3.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-faint">
              Recent activity
            </span>
          </div>
          <div>
            {activity.slice(0, 8).map((a: any, i: number) => (
              <div
                key={a.id}
                className={`flex items-center gap-3 px-5 py-2.5 ${i > 0 ? 'border-t border-line' : ''}`}
              >
                <span className="size-1.5 shrink-0 rounded-full bg-brand/50" />
                <p className="min-w-0 flex-1 truncate text-xs text-body">{a.summary}</p>
                <span className="shrink-0 text-[10px] text-faint">
                  {new Date(a.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {profile?.householdIds?.length ? (
        <motion.button
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={() => {
            if (window.confirm('Leave this family? Your expenses stay, but you stop seeing new ones.')) {
              void leaveHousehold();
            }
          }}
          className="w-full rounded-2xl border border-negative/25 bg-negative/10 py-3 text-xs font-bold text-negative transition-colors hover:bg-negative/15"
        >
          Leave this family
        </motion.button>
      ) : null}
    </div>
  );
}

function SmallButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-xl bg-surface px-3 py-1.5 text-[11px] font-bold text-brand shadow-sm transition-colors hover:brightness-95"
    >
      {children}
    </button>
  );
}