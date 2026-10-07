import React, { useState } from 'react';
import { VectorIcon } from '../components/vector/VectorIcons';
import { Modal } from '../components/ui/Modal';
import { Banner, Button, Field, TextInput } from '../components/ui/Field';
import { NOTE_COLORS, NOTE_INK } from '../lib/notes';
import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';

const COUNTRIES = [
  { code: 'IN', dial: '+91', flag: '🇮🇳' },
  { code: 'US', dial: '+1', flag: '🇺🇸' },
  { code: 'GB', dial: '+44', flag: '🇬🇧' },
  { code: 'AE', dial: '+971', flag: '🇦🇪' },
  { code: 'SG', dial: '+65', flag: '🇸🇬' },
];

export function ProfileScreen() {
  const { profile, user, updateProfile } = useAuth();
  const { members, household } = useHousehold();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState(profile?.displayName || '');
  const [country, setCountry] = useState(profile?.countryIso || 'IN');
  const [dob, setDob] = useState(profile?.dateOfBirth || '');
  const [mobile, setMobile] = useState(profile?.mobile || '');
  const [avatar, setAvatar] = useState(profile?.avatarPath || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const initials = (profile?.displayName || user?.email || 'U')
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const myMember = members.find((m: any) => m.uid === user?.uid);

  const save = async () => {
    if (!name.trim()) {
      setError('A name is required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updateProfile({
        displayName: name.trim(),
        countryIso: country,
        dateOfBirth: dob || null,
        mobile: mobile || null,
        mobileCountryIso: mobile ? country : null,
        avatarPath: avatar || null,
        profileCompleted: true,
      });
      // The member row is what the ledger renders next to an expense, so a name
      // change has to land there too or the two disagree until the next write.
      setOpen(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err?.message || 'Could not save your profile.');
    } finally {
      setBusy(false);
    }
  };

  const pickAvatar = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => setAvatar(String(reader.result));
      reader.readAsDataURL(file);
    };
    input.click();
  };

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand text-lg font-bold text-white"
            title="Change photo"
          >
            {avatar ? (
              <img src={avatar} alt="" className="size-full object-cover" />
            ) : (
              initials
            )}
          </button>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-bold tracking-tight text-body">
              {profile?.displayName || 'You'}
            </h2>
            <p className="truncate text-xs text-muted">{user?.email}</p>
            <p className="mt-1 text-[11px] font-medium text-faint">
              {myMember ? 'Member' : 'Not yet in a family'} ·{' '}
              {household?.name || 'No household'}
            </p>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => setOpen(true)}>
            <VectorIcon name="edit" size={15} />
            Edit profile
          </Button>
        </div>

        {saved && (
          <p className="mt-3 rounded-xl border border-positive/25 bg-positive/10 px-3 py-2 text-xs font-semibold text-positive">
            Profile saved.
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
        <div className="border-b border-line px-5 py-3.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-faint">
            Details
          </span>
        </div>
        <Row label="Name" value={profile?.displayName || '—'} />
        <Row label="Email" value={user?.email || '—'} />
        <Row label="Country" value={profile?.countryIso || '—'} />
        <Row label="Mobile" value={profile?.mobile || '—'} />
        <Row label="Households" value={String(profile?.householdIds?.length || 0)} last />
      </section>

      <Modal open={open} onClose={() => setOpen(false)} title="Edit your profile">
        <div className="space-y-4">
          {error && <Banner tone="error">{error}</Banner>}

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={pickAvatar}
              className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand text-lg font-bold text-white"
            >
              {avatar ? <img src={avatar} alt="" className="size-full object-cover" /> : initials}
            </button>
            <div className="space-y-2">
              <Button variant="ghost" size="sm" onClick={pickAvatar}>
                <VectorIcon name="camera" size={14} />
                Choose a photo
              </Button>
              {avatar && (
                <button
                  type="button"
                  onClick={() => setAvatar('')}
                  className="block text-[11px] font-semibold text-negative hover:underline"
                >
                  Remove photo
                </button>
              )}
              <p className="max-w-[15rem] text-[10px] leading-snug text-faint">
                Kept on this device only — Cloud Storage is not enabled on this
                project.
              </p>
            </div>
          </div>

          <Field label="Name" icon="users">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Country">
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full cursor-pointer bg-transparent text-sm text-body outline-none"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code} ({c.dial})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Mobile">
              <TextInput
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder={COUNTRIES.find((c) => c.code === country)?.dial}
              />
            </Field>
          </div>

          <Field label="Date of birth">
            <TextInput type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </Field>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button busy={busy} onClick={() => void save()}>
              Save changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 px-5 py-3 ${last ? '' : 'border-b border-line'}`}>
      <span className="text-xs font-medium text-muted">{label}</span>
      <span className="truncate text-sm font-semibold text-body">{value}</span>
    </div>
  );
}