import crypto from 'crypto';

const SCRYPT_KEYLEN = 64;
const SCRYPT_PARAMS: crypto.ScryptOptions = {
  N: 16384,
  r: 8,
  p: 1,
};

function scryptAsync(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = crypto.randomBytes(32).toString('hex');
  const derived = await scryptAsync(password, salt);
  return {
    hash: derived.toString('hex'),
    salt,
  };
}

export async function verifyPassword(
  password: string,
  storedHash: string | null | undefined,
  storedSalt: string | null | undefined
): Promise<boolean> {
  if (!password || !storedHash || !storedSalt) {
    return false;
  }

  try {
    const derived = await scryptAsync(password, storedSalt);
    const expected = Buffer.from(storedHash, 'hex');
    if (derived.length !== expected.length) {
      return false;
    }
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}