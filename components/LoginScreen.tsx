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

const inputClass =
  'w-full px-3.5 py-3 rounded-xl bg-black/70 border border-white/15 text-base text-white placeholder-stone-500 focus:outline-none focus:border-champagne-gold font-sans';

export function LoginScreen({ mode, names }: LoginScreenProps) {
  return (
    <main className="flex-1 min-h-screen flex flex-col items-center justify-center px-4 py-10 font-sans">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-wine-900/90 via-wine-950 to-black flex items-center justify-center shadow-lg border border-champagne-500/30">
            <WineIcon className="w-6 h-6 text-champagne-accent" />
          </div>
          <h1 className="font-serif font-bold text-3xl tracking-[0.18em] gold-text-shimmer uppercase">Vino</h1>
          <p className="text-sm text-stone-300">
            {mode === 'setup' ? 'Set up your two accounts to get started.' : 'Who’s tasting?'}
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
        {names.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => {
              setName(n);
              setError(null);
            }}
            aria-pressed={name === n}
            className={`p-4 rounded-3xl border flex flex-col items-center gap-2 transition-all ${
              name === n
                ? 'bg-wine-950/80 border-champagne-500/60 shadow-gold-glow'
                : 'luxury-card border-white/10 hover:border-champagne-500/35'
            }`}
          >
            <span className="w-12 h-12 rounded-full bg-champagne-950 border border-champagne-500/40 text-lg font-bold text-champagne-accent flex items-center justify-center">
              {n.charAt(0).toUpperCase()}
            </span>
            <span className="text-sm font-semibold text-stone-100 truncate max-w-full">{n}</span>
          </button>
        ))}
      </div>

      {name && (
        <div className="space-y-3 animate-fadeIn">
          <label className="block space-y-1.5">
            <span className="text-xs text-stone-300 font-medium">{name}’s password</span>
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
          {error && <p className="text-sm text-rose-300" role="alert">{error}</p>}
          <button
            type="submit"
            disabled={busy || !password}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-wine-900 via-wine-800 to-black text-champagne-100 border border-champagne-500/35 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Lock className="w-4 h-4 text-champagne-gold" />
            <span>{busy ? 'Signing in…' : 'Sign in'}</span>
          </button>
          <p className="text-xs text-stone-400 text-center">
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
        <div key={i} className="p-4 rounded-3xl luxury-card space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-champagne-300">
              {i === 0 ? 'First person' : 'Second person'}
            </span>
            <button
              type="button"
              onClick={() => setMe(i as 0 | 1)}
              aria-pressed={me === i}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                me === i
                  ? 'bg-champagne-950 text-champagne-accent border-champagne-500/50'
                  : 'bg-stone-900 text-stone-300 border-white/10'
              }`}
            >
              {me === i && <Check className="w-3.5 h-3.5" />}
              <span>This is me</span>
            </button>
          </div>
          <label className="block space-y-1.5">
            <span className="text-xs text-stone-300 font-medium">Name</span>
            <input
              type="text"
              autoComplete={me === i ? 'username' : 'off'}
              value={p.name}
              onChange={(e) => update(i, 'name', e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs text-stone-300 font-medium">Password (at least 8 characters)</span>
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
      <p className="text-xs text-stone-400">
        Names already in your cellar are filled in, so each person keeps their own past ratings. Either of you can change
        your password later in Settings.
      </p>
      {error && <p className="text-sm text-rose-300" role="alert">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-wine-900 via-wine-800 to-black text-champagne-100 border border-champagne-500/35 text-sm font-bold disabled:opacity-50"
      >
        {busy ? 'Creating accounts…' : 'Create accounts and sign in'}
      </button>
    </form>
  );
}
