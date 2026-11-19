'use client';

import React, { useState } from 'react';
import { Wine as WineIcon, Lock, Check } from 'lucide-react';

interface LoginScreenProps {
  mode: 'login' | 'setup';
  // login: the two account names. setup: suggested names for partner 1 and 2.
  names: string[];
}

async function post(url: string, body: unknown): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return res.ok && data.success ? null : data.error || `Something went wrong (${res.status}).`;
  } catch {
    return "Couldn't reach the server. Check your connection.";
  }
}

const inputClass = 'w-full px-3.5 py-3 text-base field-input shadow-sm';

export function LoginScreen({ mode, names }: LoginScreenProps) {
  return (
    <main className="flex-1 min-h-screen flex flex-col items-center justify-center px-4 py-10 font-sans">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2.5">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-wine-50 border border-wine-200 flex items-center justify-center shadow-sm">
            <WineIcon className="w-6 h-6 text-wine-700" />
          </div>
          <h1 className="font-serif font-bold text-3xl tracking-[0.22em] text-ink-900 uppercase">
            Vino
          </h1>
          <p className="text-sm text-ink-500">
            {mode === 'setup' ? 'Set up your two accounts to get started.' : 'Who’s tasting tonight?'}
          </p>
        </div>
        {mode === 'setup' ? <SetupForm suggested={names} /> : <LoginForm names={names} />}
      </div>
    </main>
  );
}

function LoginForm({ names }: { names: string[] }) {
  const [name, setName] = useState(names.length === 1 ? names[0] : '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !password) return;
    setBusy(true);
    setError(null);
    const problem = await post('/api/auth/login', { name, password });
    if (problem) {
      setError(problem);
      setBusy(false);
      return;
    }
    window.location.replace('/');
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {names.map((n) => {
          const active = name === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => {
                setName(n);
                setError(null);
              }}
              aria-pressed={active}
              className={`p-4 rounded-2xl border flex flex-col items-center gap-2.5 transition-all ${
                active
                  ? 'bg-wine-50/70 border-wine-600 ring-2 ring-wine-600/15 shadow-sm'
                  : 'surface-card hover:border-linen-300'
              }`}
            >
              <span
                className={`w-12 h-12 rounded-full border text-lg font-bold flex items-center justify-center transition-colors ${
                  active
                    ? 'bg-wine-700 border-wine-700 text-white'
                    : 'bg-linen-100 border-linen-200 text-wine-700'
                }`}
              >
                {n.charAt(0).toUpperCase()}
              </span>
              <span className="text-sm font-semibold text-ink-900 truncate max-w-full">{n}</span>
            </button>
          );
        })}
      </div>

      {name && (
        <div className="space-y-3 animate-fadeIn">
          <label className="block space-y-1.5">
            <span className="text-xs text-ink-700 font-medium">{name}’s password</span>
            <input
              type="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </label>
          {/* Lets password managers save the right name with the password. */}
          <input type="text" name="username" autoComplete="username" value={name} readOnly hidden />
          {error && (
            <p className="text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-2.5" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || !password}
            className="w-full py-3 rounded-xl btn-primary text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            <span>{busy ? 'Signing in…' : 'Sign in'}</span>
          </button>
          <p className="text-xs text-ink-500 text-center">
            Forgotten it? Your partner can reset it from Settings.
          </p>
        </div>
      )}
    </form>
  );
}

function SetupForm({ suggested }: { suggested: string[] }) {
  const [people, setPeople] = useState([
    { name: suggested[0] || '', password: '' },
    { name: suggested[1] || '', password: '' },
  ]);
  const [me, setMe] = useState<0 | 1>(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const update = (i: number, field: 'name' | 'password', value: string) =>
    setPeople((prev) => prev.map((p, j) => (j === i ? { ...p, [field]: value } : p)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const problem = await post('/api/auth/setup', { people, me });
    if (problem) {
      setError(problem);
      setBusy(false);
      return;
    }
    window.location.replace('/');
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {people.map((p, i) => (
        <div key={i} className="p-4 rounded-2xl surface-card space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-wine-700">
              {i === 0 ? 'First person' : 'Second person'}
            </span>
            <button
              type="button"
              onClick={() => setMe(i as 0 | 1)}
              aria-pressed={me === i}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${
                me === i
                  ? 'bg-wine-700 text-white border-wine-700'
                  : 'bg-linen-50 text-ink-700 border-linen-200'
              }`}
            >
              {me === i && <Check className="w-3.5 h-3.5" />}
              <span>This is me</span>
            </button>
          </div>
          <label className="block space-y-1.5">
            <span className="text-xs text-ink-700 font-medium">Name</span>
            <input
              type="text"
              autoComplete={me === i ? 'username' : 'off'}
              value={p.name}
              onChange={(e) => update(i, 'name', e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs text-ink-700 font-medium">Password (at least 8 characters)</span>
            <input
              type="password"
              autoComplete={me === i ? 'new-password' : 'off'}
              value={p.password}
              onChange={(e) => update(i, 'password', e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
      ))}
      <p className="text-xs text-ink-500 leading-relaxed">
        Names already in your cellar are filled in, so each person keeps their own past ratings. Either of you can
        change your password later in Settings.
      </p>
      {error && (
        <p className="text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-2.5" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="w-full py-3 rounded-xl btn-primary text-sm font-semibold disabled:opacity-50"
      >
        {busy ? 'Creating accounts…' : 'Create accounts and sign in'}
      </button>
    </form>
  );
}
