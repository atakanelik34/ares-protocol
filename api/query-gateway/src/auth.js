import crypto from 'node:crypto';
import { verifyMessage } from 'viem';

export function buildChallenge(account, nonce, expiresAt) {
  return `ARES API access challenge\naccount:${account.toLowerCase()}\nnonce:${nonce}\nexpires:${expiresAt}`;
}

export function randomNonce() {
  return crypto.randomBytes(16).toString('hex');
}

export async function verifySignature({ account, message, signature }) {
  return verifyMessage({ address: account, message, signature });
}
