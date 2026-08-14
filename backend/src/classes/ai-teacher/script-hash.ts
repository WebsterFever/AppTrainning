import { createHash } from 'crypto';

// Fingerprints exactly the inputs that affect generated audio. Used both at
// generation time (to stamp the block) and at read time (to detect when an
// admin has edited the script/settings since the last generation) — kept as
// a single shared function so both sides can never drift apart.
export function computeScriptHash(
  content?: string,
  language?: string,
  voice?: string,
  rate?: number,
): string {
  return createHash('sha256')
    .update(JSON.stringify({ content: content ?? '', language: language ?? '', voice: voice ?? '', rate: rate ?? 1 }))
    .digest('hex');
}
