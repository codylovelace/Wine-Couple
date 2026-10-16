#!/usr/bin/env node
// Emergency password reset, for when neither of you can sign in.
// In Portainer: Containers > wine-couple > Console (sh), then:
//   node scripts/reset-password.mjs "Cody" "new-password"
// Writes the same hash format as lib/auth.ts and signs that person out everywhere.
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const [name, password] = process.argv.slice(2);
if (!name || !password) {
  console.error('Usage: node scripts/reset-password.mjs "<name>" "<new password>"');
  process.exit(1);
}
if (password.length < 8) {
  console.error('Passwords need at least 8 characters.');
  process.exit(1);
}

const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const usersFile = path.join(dataDir, 'users.json');
const sessionsFile = path.join(dataDir, 'sessions.json');

function writeAtomic(file, data) {
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, file);
}

const users = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
const user = users.find((u) => u.name.toLowerCase() === name.trim().toLowerCase());
if (!user) {
  console.error(`No account called "${name}". Accounts: ${users.map((u) => u.name).join(', ')}`);
  process.exit(1);
}

const N = 16384, r = 8, p = 1;
const salt = crypto.randomBytes(16);
const key = crypto.scryptSync(password, salt, 64, { N, r, p, maxmem: 64 * 1024 * 1024 });
user.passwordHash = ['scrypt', N, r, p, salt.toString('base64'), key.toString('base64')].join('$');
user.passwordChangedAt = new Date().toISOString();
writeAtomic(usersFile, users);

if (fs.existsSync(sessionsFile)) {
  const sessions = JSON.parse(fs.readFileSync(sessionsFile, 'utf-8'));
  for (const [k, s] of Object.entries(sessions)) if (s.userId === user.id) delete sessions[k];
  writeAtomic(sessionsFile, sessions);
}
console.log(`Password reset for ${user.name}.`);
