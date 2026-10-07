import React, { useState } from 'react';
import { RvsLogo } from '../components/vector/RvsLogo';
import { Banner, Button, Field, SelectInput, TextInput } from '../components/ui/Field';
import { useAuth } from '../contexts/AuthContext';

const COUNTRIES = [
  { code: 'IN', dial: '+91', flag: '🇮🇳' },
  { code: 'US', dial: '+1', flag: '🇺🇸' },
  { code: 'GB', dial: '+44', flag: '🇬🇧' },
  { code: 'AE', dial: '+971', flag: '🇦🇪' },
  { code: 'SG', dial: '+65', flag: '🇸🇬' },
];

export function ProfileSetupScreen() {
  const { profile, saveProfile } = useAuth();

  const [name, setName] = useState(profile?.displayName || '');
  const [dob, setDob] = useState(profile?.dateOfBirth || '');
  const [country, setCountry] = useState(profile?.countryIso || 'IN');
  const [mobile, setMobile] = useState(profile?.mobile || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dial = COUNTRIES.find((c) => c.code === country)?.dial || '+91';

  const save = async (completed: boolean) => {
    if (!name.trim()) {
      setError('A name is required — it is what your family sees on every expense.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveProfile({
        displayName: name.trim(),
        dateOfBirth: dob || null,
        countryIso: country,
        mobile: mobile || null,
        mobileCountryIso: mobile ? country : null,
        profileCompleted: completed,
      });
    } catch (err: any) {
      setError(err?.message || 'Could not save your profile.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-line bg-surface p-8 shadow-xl">
        <div className="flex flex-col items-center gap-2 text-center">
          <RvsLogo size={52} />
          <h1 className="text-xl font-black tracking-tight text-body">
            {profile?.profileCompleted ? 'Edit your profile' : 'Complete your profile'}
          </h1>
          <p className="text-xs font-medium text-muted">
            This is what your family sees next to every expense you log.
          </p>
        </div>

        {error && <Banner tone="error">{error}</Banner>}

        <div className="space-y-4">
          <Field label="Name" icon="users">
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoFocus
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Country">
              <SelectInput value={country} onChange={(e) => setCountry(e.target.value)}>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <Field label="Mobile (optional)" icon="phone">
              <TextInput
                type="tel"
                inputMode="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder={dial}
              />
            </Field>
          </div>

          <Field label="Date of birth (optional)" icon="calendar" hint="Used for nothing but your own reference.">
            <TextInput type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </Field>
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" busy={busy} onClick={() => void save(false)}>
            Skip for now
          </Button>
          <Button className="flex-1" busy={busy} onClick={() => void save(true)}>
            Save &amp; continue
          </Button>
        </div>
      </div>
    </div>
  );
}