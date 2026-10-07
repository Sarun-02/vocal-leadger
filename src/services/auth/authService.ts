import type { Repository } from '../../db';
import type { UserAccount } from '../../models/types';

/**
 * Local, on-device sign-in. There is no server: the password only protects the ledger on
 * this phone. Passwords are never stored — only a salted PBKDF2-SHA256 hash.
 */
const ACCOUNT_KEY = 'account';
const SESSION_KEY = 'session';
const ITERATIONS = 120_000;

export const USERNAME_RULES = 'Use 3–40 letters, numbers, dots, dashes, underscores or @.';
export const PASSWORD_MIN = 4;

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hash(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, key, 256);
  return toB64(bits);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function normaliseUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateUsername(raw: string): string | null {
  const u = normaliseUsername(raw);
  if (!u) return 'Enter a username or email.';
  if (!/^[a-z0-9._@-]{3,40}$/.test(u)) return USERNAME_RULES;
  return null;
}

export function validatePassword(raw: string): string | null {
  if (!raw) return 'Enter a password.';
  if (raw.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters.`;
  if (raw.length > 128) return 'Password is too long.';
  return null;
}

export class AuthService {
  constructor(private readonly repo: Repository) {}

  async getAccount(): Promise<UserAccount | null> {
    const raw = await this.repo.getValue(ACCOUNT_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserAccount;
    } catch {
      return null;
    }
  }

  async getSession(): Promise<string | null> {
    return this.repo.getValue(SESSION_KEY);
  }

  async createAccount(username: string, password: string): Promise<UserAccount> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const account: UserAccount = {
      username: normaliseUsername(username),
      salt: toB64(salt),
      iterations: ITERATIONS,
      passwordHash: await hash(password, salt, ITERATIONS),
    };
    await this.repo.setValue(ACCOUNT_KEY, JSON.stringify(account));
    await this.repo.setValue(SESSION_KEY, account.username);
    return account;
  }

  async verify(account: UserAccount, username: string, password: string): Promise<boolean> {
    if (normaliseUsername(username) !== account.username) return false;
    const candidate = await hash(password, fromB64(account.salt), account.iterations);
    return constantTimeEqual(candidate, account.passwordHash);
  }

  async signIn(username: string, password: string): Promise<boolean> {
    const account = await this.getAccount();
    if (!account || !(await this.verify(account, username, password))) return false;
    await this.repo.setValue(SESSION_KEY, account.username);
    return true;
  }

  async changePassword(current: string, next: string): Promise<boolean> {
    const account = await this.getAccount();
    if (!account || !(await this.verify(account, account.username, current))) return false;
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const updated: UserAccount = { ...account, salt: toB64(salt), iterations: ITERATIONS, passwordHash: await hash(next, salt, ITERATIONS) };
    await this.repo.setValue(ACCOUNT_KEY, JSON.stringify(updated));
    return true;
  }

  async signOut(): Promise<void> {
    await this.repo.deleteValue(SESSION_KEY);
  }
}
