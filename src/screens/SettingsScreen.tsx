import React from 'react';
import { VectorIcon } from '../components/vector/VectorIcons';
import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { useSettings } from '../contexts/SettingsContext';
import { formatMoney } from '../utils/format';

export function SettingsScreen({ onNavigate }: { onNavigate: (screen: 'profile') => void }) {
  const { signOut } = useAuth();
  const { household, members, expenses, wallets } = useHousehold();
  const { themeMode, setThemeMode, darkIntensity, setDarkIntensity } = useSettings();

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
        <Header>Appearance</Header>

        <div className="px-5 py-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-faint">Theme</p>
          <div className="flex items-center gap-1 rounded-2xl bg-surface-sunken p-1">
            {(['light', 'dark', 'system'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setThemeMode(mode)}
                className={`flex-1 rounded-xl py-2 text-xs font-bold capitalize transition-all ${
                  themeMode === mode ? 'bg-surface text-brand shadow-xs' : 'text-muted'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-line px-5 py-4">
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-faint">
              Dark strength
            </p>
            <span className="text-[11px] font-bold text-brand">{Math.round(darkIntensity * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={darkIntensity}
            onChange={(e) => setDarkIntensity(Number(e.target.value))}
            aria-label="Dark strength"
            className="w-full accent-[var(--color-brand)]"
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
        <Header>Your account</Header>
        <Row
          icon="users"
          label="Profile"
          onClick={() => onNavigate('profile')}
        />
        <Row icon="home" label="Household" value={household?.name || '—'} />
        <Row icon="users" label="Members" value={String(members.length)} />
        <Row icon="receipt" label="Expenses" value={String(expenses.filter((e: any) => !e.deletedAt).length)} />
        <Row
          icon="wallet"
          label="Allowance left"
          value={formatMoney(
            members.reduce(
              (sum: number, m: any) =>
                sum + (Number(wallets.find((w: any) => w.uid === m.uid)?.balanceMinor) || 0),
              0,
            ),
            household?.baseCurrency || 'INR',
          )}
          last
        />
      </section>

      <section className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
        <Header>Session</Header>
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex w-full items-center gap-2.5 px-5 py-3.5 text-xs font-bold text-negative transition-colors hover:bg-negative/10"
        >
          <VectorIcon name="logout" size={15} color="var(--color-negative)" />
          Sign out
        </button>
      </section>

      <p className="px-1 text-center text-[11px] text-faint">
        Expence · realtime Firestore ledger shared with your Android app.
      </p>
    </div>
  );
}

function Header({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-b border-line px-5 py-3.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-faint">{children}</span>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
  onClick,
  last,
}: {
  icon: string;
  label: string;
  value?: string;
  onClick?: () => void;
  last?: boolean;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={`flex w-full items-center gap-2.5 px-5 py-3 text-left transition-colors ${
        last ? '' : 'border-b border-line'
      } ${onClick ? 'hover:bg-surface-sunken' : ''}`}
    >
      <VectorIcon name={icon} size={15} className="shrink-0 text-faint" />
      <span className="flex-1 text-sm font-semibold text-body">{label}</span>
      {value && <span className="truncate text-xs font-medium text-muted">{value}</span>}
      {onClick && <VectorIcon name="chevronRight" size={14} className="shrink-0 text-faint" />}
    </Tag>
  );
}