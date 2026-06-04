import { parseExpiry, type Statement } from '@novasamatech/sdk-statement';

const HEX = '0123456789abcdef';

function toHex(bytes: Uint8Array): string {
  let out = '0x';
  for (const b of bytes) out += HEX[b >> 4] + HEX[b & 0xf];
  return out;
}

/** Best-effort UTF-8 preview of payload bytes; null if it isn't printable text. */
function utf8Preview(bytes: Uint8Array): string | null {
  try {
    const s = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    // Reject strings containing control chars other than tab/newline/CR.
    for (const ch of s) {
      const c = ch.codePointAt(0)!;
      const printable = c >= 0x20 || c === 0x09 || c === 0x0a || c === 0x0d;
      if (!printable) return null;
    }
    return s;
  } catch {
    return null;
  }
}

/** A statement reduced to a JSON-serializable, human-readable view. */
export function toView(stmt: Statement): Record<string, unknown> {
  const proof = stmt.proof as { type?: string; value?: { signer?: string } } | undefined;
  const view: Record<string, unknown> = {};

  if (proof?.value?.signer) view.account = proof.value.signer;
  if (proof?.type) view.proofType = proof.type;
  if (stmt.channel) view.channel = stmt.channel;

  if (stmt.expiry !== undefined) {
    const { timestamp, sequence } = parseExpiry(stmt.expiry);
    view.expiry = stmt.expiry.toString();
    view.expiryTimestamp = timestamp;
    view.expiryDate = new Date(timestamp * 1000).toISOString();
    view.expirySequence = sequence;
  }

  view.topics = stmt.topics ?? [];
  view.encrypted = stmt.decryptionKey !== undefined;
  if (stmt.decryptionKey) view.decryptionKey = stmt.decryptionKey;

  const data = stmt.data;
  view.dataLen = data ? data.length : 0;
  if (data && data.length > 0) {
    view.data = toHex(data);
    const text = utf8Preview(data);
    if (text !== null) view.dataText = text;
  }

  return view;
}

export function formatStatement(stmt: Statement): string {
  return JSON.stringify(toView(stmt), null, 2);
}
