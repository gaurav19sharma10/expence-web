import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RvsLogo } from '../vector/RvsLogo';
import { VectorIcon } from '../vector/VectorIcons';
import { useAuth } from '../../contexts/AuthContext';
import { useHousehold } from '../../contexts/HouseholdContext';
import { useSettings } from '../../contexts/SettingsContext';
import type { Screen } from '../../screens/navigation';

interface Props {
  screen: Screen;
  onNavigate: (screen: Screen) => void;
  query: string;
  onQueryChange: (value: string) => void;
}

/**
 * Icon names are restricted to keys the icon set actually has. An unknown name
 * does not throw -- `resolveIconKey` falls back to the generic dots glyph -- so a
 * typo here shows up as a row of identical dots rather than as an error, which is
 * why these are spelled out rather than invented per screen.
 */
const NAV: { key: Screen; label: string; icon: string }[] = [
  { key: 'home', label: 'Ledger', icon: 'receipt' },
  { key: 'history', label: 'History', icon: 'clock' },
  { key: 'insights', label: 'Insights', icon: 'chart' },
  { key: 'members', label: 'Family', icon: 'users' },
  { key: 'settings', label: 'Settings', icon: 'sliders' },
];

export function AppHeader({ screen, onNavigate, query, onQueryChange }: Props) {
  const { user, profile, signOut } = useAuth();
  const { household, members, loading } = useHousehold();
  const { themeMode, setThemeMode } = useSettings();
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  const initials = (profile?.displayName || user?.email || 'U')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const copyCode = async () => {
    if (!household?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(household.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is unavailable over plain http and on some mobile browsers.
      // The code is on screen anyway, so there is nothing useful to say.
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:gap-4 md:px-8">
        <div className="flex shrink-0 items-center gap-2.5">
          <RvsLogo size={38} showText />
          {household && (
            <span className="hidden items-center gap-1.5 rounded-full border border-brand/25 bg-brand-light px-2.5 py-1 text-[11px] font-bold text-brand lg:inline-flex">
              <span className="size-1.5 rounded-full bg-brand" />
              {household.name}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative flex items-center rounded-2xl border border-line bg-surface shadow-sm transition-colors hover:bg-surface-sunken focus-within:border-brand/60 focus-within:bg-surface">
            <span className="pl-3.5 pr-2 text-faint">
              <VectorIcon name="search" size={18} />
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search expenses, merchants, notes…"
              aria-label="Search expenses"
              className="w-full bg-transparent py-2.5 pr-9 text-sm text-body outline-none placeholder:text-faint"
            />
            {query && (
              <button
                type="button"
                onClick={() => onQueryChange('')}
                aria-label="Clear search"
                className="absolute right-2.5 rounded-full p-1 text-faint hover:text-body"
              >
                <VectorIcon name="close" size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted shadow-sm sm:flex">
            <span className={`size-2 rounded-full ${loading ? 'animate-pulse bg-amber-500' : 'bg-emerald-500'}`} />
            {loading ? 'Syncing' : `${members.length} live`}
          </div>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Account menu"
              className="flex size-9 items-center justify-center rounded-full bg-brand text-xs font-bold text-white shadow-md shadow-brand/25 transition-shadow hover:ring-2 hover:ring-brand/40"
            >
              {initials}
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  role="menu"
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-line bg-surface p-2 shadow-xl"
                >
                  <div className="flex items-center gap-3 border-b border-line px-2 pb-3 pt-1">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-body">
                        {profile?.displayName || 'You'}
                      </p>
                      <p className="truncate text-xs text-muted">{user?.email}</p>
                    </div>
                  </div>

                  <div className="py-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('profile');
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-body transition-colors hover:bg-surface-sunken"
                    >
                      <VectorIcon name="users" size={15} color="var(--color-brand)" />
                      Your profile
                    </button>

                    {household?.inviteCode && (
                      <button
                        type="button"
                        onClick={() => {
                          void copyCode();
                          setMenuOpen(false);
                        }}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-body transition-colors hover:bg-surface-sunken"
                      >
                        <span className="flex items-center gap-2.5">
                          <VectorIcon name="copy" size={15} color="var(--color-muted)" />
                          Invite code
                        </span>
                        <span className="rounded bg-brand-light px-2 py-0.5 font-mono text-[11px] font-bold text-brand">
                          {copied ? 'Copied' : household.inviteCode}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setThemeMode(themeMode === 'dark' ? 'light' : 'dark')
                      }
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-body transition-colors hover:bg-surface-sunken"
                    >
                      <VectorIcon name="sparkles" size={15} />
                      {themeMode === 'dark' ? 'Light mode' : 'Dark mode'}
                    </button>
                  </div>

                  <div className="border-t border-line pt-1.5">
                    <button
                      type="button"
                      onClick={() => void signOut()}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-negative transition-colors hover:bg-negative/10"
                    >
                      <VectorIcon name="logout" size={15} color="var(--color-negative)" />
                      Sign out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <nav className="mx-auto hidden max-w-7xl items-center gap-1 px-4 pb-2 md:flex md:px-8">
        {NAV.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onNavigate(item.key)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
              screen === item.key
                ? 'bg-brand-light text-brand'
                : 'text-muted hover:bg-surface-sunken hover:text-body'
            }`}
          >
            <VectorIcon name={item.icon} size={14} />
            {item.label}
          </button>
        ))}
      </nav>
    </header>
  );
}

/** The bottom bar is the mobile counterpart to the desktop nav above. */
export function BottomNav({
  screen,
  onNavigate,
  onAdd,
}: {
  screen: Screen;
  onNavigate: (screen: Screen) => void;
  onAdd: () => void;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-line bg-canvas/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
      {NAV.slice(0, 2).map((item) => (
        <NavButton key={item.key} item={item} active={screen === item.key} onClick={() => onNavigate(item.key)} />
      ))}

      <button
        type="button"
        onClick={onAdd}
        aria-label="Add expense"
        className="-mt-5 flex size-12 shrink-0 items-center justify-center self-center rounded-full bg-brand text-white shadow-lg shadow-brand/30 active:scale-95"
      >
        <VectorIcon name="plus" size={22} strokeWidth={2.4} />
      </button>

      {NAV.slice(2, 4).map((item) => (
        <NavButton key={item.key} item={item} active={screen === item.key} onClick={() => onNavigate(item.key)} />
      ))}
    </nav>
  );
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: { key: Screen; label: string; icon: string };
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold transition-colors ${
        active ? 'text-brand' : 'text-muted'
      }`}
    >
      <VectorIcon name={item.icon} size={19} />
      {item.label}
    </button>
  );
}