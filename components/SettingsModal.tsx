'use client';

import React, { useEffect, useState } from 'react';
import { PublicUser, UserSettings, Wine } from '@/lib/types';
import { api } from '@/lib/api-client';
import { X, User, Key, Download, Upload, LogOut, Lock } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  me: PublicUser;
  partner: PublicUser | null;
  settings: UserSettings;
  wineCount: number;
  onSettingsChanged: (settings: UserSettings) => void;
  onRenamed: (user: PublicUser) => void;
  onImported: (wines: Wine[]) => void;
}

const inputClass =
  'w-full px-3 py-2.5 rounded-xl bg-black/70 border border-white/15 text-sm text-white focus:outline-none focus:border-champagne-gold font-sans';
const cardClass = 'p-4 rounded-3xl luxury-card space-y-3';
const titleClass = 'text-xs font-semibold uppercase tracking-wider text-champagne-300 flex items-center gap-1.5';
const buttonClass =
  'px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-white/15 text-sm font-semibold text-stone-100 disabled:opacity-50';

// A small form section with its own saving state and message.
function useAction() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    setMessage(null);
    try {
      setMessage({ ok: true, text: await fn() });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : 'Something went wrong.' });
    } finally {
      setBusy(false);
    }
  };
  const view = message && (
    <p className={`text-xs ${message.ok ? 'text-emerald-300' : 'text-rose-300'}`} role={message.ok ? 'status' : 'alert'}>
      {message.text}
    </p>
  );
  return { busy, run, view, clear: () => setMessage(null) };
}

export function SettingsModal({
  isOpen,
  onClose,
  me,
  partner,
  settings,
  wineCount,
  onSettingsChanged,
  onRenamed,
  onImported,
}: SettingsModalProps) {
  const [name, setName] = useState(me.name);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetOwnPassword, setResetOwnPassword] = useState('');
  const [partnerPassword, setPartnerPassword] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');

  const nameAction = useAction();
  const passwordAction = useAction();
  const partnerAction = useAction();
  const prefsAction = useAction();
  const backupAction = useAction();

  useEffect(() => {
    if (!isOpen) return;
    setName(me.name);
    setCurrentPassword('');
    setNewPassword('');
    setResetOwnPassword('');
    setPartnerPassword('');
    setGeminiApiKey('');
    [nameAction, passwordAction, partnerAction, prefsAction, backupAction].forEach((a) => a.clear());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const saveSettings = (body: { defaultCurrency?: string; geminiApiKey?: string }, done: string) =>
    prefsAction.run(async () => {
      const { settings: updated } = await api<{ settings: UserSettings }>('/api/settings', { method: 'POST', body });
      onSettingsChanged(updated);
      return done;
    });

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    backupAction.run(async () => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(await file.text());
      } catch {
        throw new Error("That file isn't a Wine Couple backup.");
      }
      const incoming = Array.isArray(parsed) ? parsed : (parsed as { wines?: unknown[] })?.wines;
      const count = Array.isArray(incoming) ? incoming.length : 0;
      if (
        !confirm(
          `Replace all ${wineCount} wines in your cellar with the ${count} in this backup? This affects both of you and can't be undone.`
        )
      ) {
        return 'Import cancelled.';
      }
      const { wines } = await api<{ wines: Wine[] }>('/api/wines/import', { method: 'POST', body: parsed });
      onImported(wines);
      return `Restored ${wines.length} wines.`;
    });
  };

  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    window.location.href = '/login';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div
        className="w-full max-w-md max-h-[92dvh] bg-[#0f0a0d] border border-champagne-500/25 rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-champagne-500/15 flex items-center justify-between">
          <h2 className="font-serif font-semibold text-lg text-stone-100">Settings</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full bg-stone-900 text-stone-300 hover:text-white flex items-center justify-center border border-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans">
          {/* Your account */}
          <section className={cardClass}>
            <h3 className={titleClass}>
              <User className="w-3.5 h-3.5 text-champagne-gold" />
              <span>Your account</span>
            </h3>
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                nameAction.run(async () => {
                  const { user } = await api<{ user: PublicUser }>('/api/auth/account', { method: 'PATCH', body: { name } });
                  onRenamed(user);
                  return 'Name saved. Use it to sign in from now on.';
                });
              }}
            >
              <label className="block space-y-1">
                <span className="text-xs text-stone-300">Your name (also what you sign in with)</span>
                <div className="flex gap-2">
                  <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} autoComplete="username" />
                  <button type="submit" disabled={nameAction.busy || !name.trim() || name.trim() === me.name} className={buttonClass}>
                    Save
                  </button>
                </div>
              </label>
              {nameAction.view}
            </form>

            <form
              className="space-y-2 pt-2 border-t border-white/10"
              onSubmit={(e) => {
                e.preventDefault();
                passwordAction.run(async () => {
                  await api('/api/auth/password', { method: 'POST', body: { currentPassword, newPassword } });
                  setCurrentPassword('');
                  setNewPassword('');
                  return 'Password changed. Your other devices have been signed out.';
                });
              }}
            >
              <span className="text-xs text-stone-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Change your password
              </span>
              <input
                type="password"
                placeholder="Current password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={inputClass}
              />
              <input
                type="password"
                placeholder="New password (8+ characters)"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
              />
              <button type="submit" disabled={passwordAction.busy || !currentPassword || !newPassword} className={buttonClass}>
                Change password
              </button>
              {passwordAction.view}
            </form>

            <button type="button" onClick={signOut} className={`${buttonClass} w-full flex items-center justify-center gap-2`}>
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </section>

          {/* Partner password reset */}
          {partner && (
            <section className={cardClass}>
              <h3 className={titleClass}>
                <Key className="w-3.5 h-3.5 text-champagne-gold" />
                <span>{partner.name} forgot their password?</span>
              </h3>
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  partnerAction.run(async () => {
                    await api('/api/auth/password', {
                      method: 'POST',
                      body: { currentPassword: resetOwnPassword, newPassword: partnerPassword, forUserId: partner.id },
                    });
                    setResetOwnPassword('');
                    setPartnerPassword('');
                    return `${partner.name}'s password is reset. Let them know the new one.`;
                  });
                }}
              >
                <input
                  type="password"
                  placeholder="Your password, to confirm it's you"
                  autoComplete="current-password"
                  value={resetOwnPassword}
                  onChange={(e) => setResetOwnPassword(e.target.value)}
                  className={inputClass}
                />
                <input
                  type="password"
                  placeholder={`New password for ${partner.name}`}
                  autoComplete="new-password"
                  value={partnerPassword}
                  onChange={(e) => setPartnerPassword(e.target.value)}
                  className={inputClass}
                />
                <button type="submit" disabled={partnerAction.busy || !resetOwnPassword || !partnerPassword} className={buttonClass}>
                  Reset {partner.name}&apos;s password
                </button>
                {partnerAction.view}
              </form>
            </section>
          )}

          {/* Shared preferences */}
          <section className={cardClass}>
            <h3 className={titleClass}>Shared settings</h3>
            <div className="space-y-1">
              <span className="text-xs text-stone-300">Currency for new wines</span>
              <div className="grid grid-cols-4 gap-2">
                {['£', '$', '€', 'A$'].map((curr) => (
                  <button
                    key={curr}
                    type="button"
                    aria-pressed={settings.defaultCurrency === curr}
                    onClick={() => saveSettings({ defaultCurrency: curr }, 'Currency saved.')}
                    className={`py-2.5 rounded-xl text-sm font-bold border ${
                      settings.defaultCurrency === curr
                        ? 'bg-champagne-950 text-champagne-accent border-champagne-500/50'
                        : 'bg-black/70 border-white/10 text-stone-300'
                    }`}
                  >
                    {curr}
                  </button>
                ))}
              </div>
            </div>

            <form
              className="space-y-2 pt-2 border-t border-white/10"
              onSubmit={(e) => {
                e.preventDefault();
                saveSettings({ geminiApiKey }, 'Gemini key saved.');
                setGeminiApiKey('');
              }}
            >
              <span className="text-xs text-stone-300 block">
                Gemini API key (optional): reads wine labels from your photos.
                {settings.geminiKeyFromEnv && ' A key is set on the server; one saved here takes priority.'}
                {settings.hasGeminiKey && !settings.geminiKeyFromEnv && ' A key is saved.'}
              </span>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder={settings.hasGeminiKey ? 'Type a new key to replace it' : 'AIzaSy…'}
                  autoComplete="off"
                  className={`${inputClass} font-mono`}
                />
                <button type="submit" disabled={prefsAction.busy || !geminiApiKey.trim()} className={buttonClass}>
                  Save
                </button>
              </div>
              {settings.hasGeminiKey && !settings.geminiKeyFromEnv && (
                <button
                  type="button"
                  onClick={() => saveSettings({ geminiApiKey: '' }, 'Gemini key removed.')}
                  className="text-xs text-stone-400 underline"
                >
                  Remove the saved key
                </button>
              )}
            </form>
            {prefsAction.view}
          </section>

          {/* Backup */}
          <section className={cardClass}>
            <h3 className={titleClass}>Backup</h3>
            <p className="text-xs text-stone-300">
              Downloads every wine, rating and comment as a file. Photos stay on the server&apos;s photo volume.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <a href="/api/export" download className={`${buttonClass} flex items-center justify-center gap-1.5`}>
                <Download className="w-4 h-4 text-champagne-300" /> Export
              </a>
              <label className={`${buttonClass} flex items-center justify-center gap-1.5 cursor-pointer`}>
                <Upload className="w-4 h-4 text-champagne-300" /> Restore
                <input type="file" accept=".json,application/json" className="hidden" onChange={handleImportFile} />
              </label>
            </div>
            {backupAction.view}
          </section>
        </div>
      </div>
    </div>
  );
}
