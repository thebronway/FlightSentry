import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_LENGTH = 32;
const KEY_SALT = 'flightsentry-imap-credentials-v1';

let cachedKey: Buffer | null = null;

function getKeyFilePath(): string {
  return process.env.NODE_ENV === 'production'
    ? '/app/data/.encryption_key'
    : path.join(process.cwd(), 'data', '.encryption_key');
}

function getEncryptionKey(): Buffer {
  if (cachedKey) return cachedKey;

  const envSecret = (process.env.ENCRYPTION_SECRET || '').trim();
  if (envSecret.length > 0) {
    cachedKey = crypto.scryptSync(envSecret, KEY_SALT, KEY_LENGTH);
    return cachedKey;
  }

  const keyPath = getKeyFilePath();
  const keyDir = path.dirname(keyPath);
  if (!fs.existsSync(keyDir)) {
    fs.mkdirSync(keyDir, { recursive: true });
  }

  if (fs.existsSync(keyPath)) {
    const hex = fs.readFileSync(keyPath, 'utf8').trim();
    if (/^[a-f0-9]{64}$/i.test(hex)) {
      cachedKey = Buffer.from(hex, 'hex');
      return cachedKey;
    }
  }

  const generated = crypto.randomBytes(KEY_LENGTH);
  fs.writeFileSync(keyPath, generated.toString('hex'), { mode: 0o600 });
  try {
    fs.chmodSync(keyPath, 0o600);
  } catch {
    // Ignore chmod failures on non-POSIX volumes
  }
  cachedKey = generated;
  return cachedKey;
}

export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `v1:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptSecret(ciphertext: string): string {
  const parts = (ciphertext || '').split(':');
  if (parts.length !== 4 || parts[0] !== 'v1') {
    throw new Error('Invalid encrypted credential payload format');
  }
  const key = getEncryptionKey();
  const iv = Buffer.from(parts[1], 'hex');
  const authTag = Buffer.from(parts[2], 'hex');
  const encrypted = Buffer.from(parts[3], 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}