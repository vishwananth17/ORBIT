import crypto from 'crypto';
import { config } from '../config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Returns the 32-byte encryption key buffer from config or derives one securely.
 */
function getKey(): Buffer {
  const hex = config.TOKEN_ENCRYPTION_KEY;
  if (hex && hex.length === 64) {
    return Buffer.from(hex, 'hex');
  }
  // Fallback SHA-256 derived key
  return crypto.createHash('sha256').update(hex || 'orbit-default-secret-encryption-key').digest();
}

/**
 * Encrypts plaintext string using AES-256-GCM.
 * Output format: Buffer containing [16-byte IV][16-byte Auth Tag][Ciphertext]
 */
export function encryptToken(plaintext: string): Buffer {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]);
}

/**
 * Decrypts a Buffer containing [16-byte IV][16-byte Auth Tag][Ciphertext].
 */
export function decryptToken(encryptedBuffer: Buffer): string {
  if (encryptedBuffer.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error('Invalid encrypted token payload length');
  }

  const key = getKey();
  const iv = encryptedBuffer.subarray(0, IV_LENGTH);
  const tag = encryptedBuffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = encryptedBuffer.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}
