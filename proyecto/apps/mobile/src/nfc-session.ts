import { decodeNfcIdentifier, encodeNfcIdentifier, type NfcRecord } from './nfc-protocol.ts';
import { objectIdFromQr } from './qr.ts';

export interface NfcAdapter {
  isSupported(): Promise<boolean>;
  isEnabled(): Promise<boolean>;
  start(): Promise<unknown>;
  request(): Promise<unknown>;
  tag(): Promise<{ isWritable?: boolean; maxSize?: number } | null>;
  status(): Promise<{ writable: boolean; capacity: number }>;
  write(bytes: number[]): Promise<void>;
  read(): Promise<NfcRecord[]>;
  cancel(): Promise<void>;
}
export type NfcPhase = 'checking' | 'waiting' | 'reading' | 'checkingTag' | 'writing' | 'verifying';

export class NfcSession {
  private busy = false;
  private cancelled = false;
  private requesting = false;
  private inFlightWrite = false;
  private adapter: NfcAdapter;
  private onPhase?: (phase: NfcPhase) => void;
  constructor(adapter: NfcAdapter, onPhase?: (phase: NfcPhase) => void) { this.adapter = adapter; this.onPhase = onPhase; }

  async cancel() {
    if (this.inFlightWrite) return false;
    this.cancelled = true;
    if (this.requesting) await this.adapter.cancel();
    return true;
  }

  /** Reads or writes a tag and returns the object id it contains. */
  async run(mode: 'read' | 'write', value?: string) {
    if (this.busy) throw new Error('BUSY');
    const bytes = mode === 'write' ? encodeNfcIdentifier(value ?? '') : null;
    this.busy = true;
    this.cancelled = false;
    try {
      this.onPhase?.('checking');
      if (!await this.adapter.isSupported()) throw new Error('UNSUPPORTED');
      if (this.cancelled) throw new Error('CANCELLED');
      if (!await this.adapter.isEnabled()) throw new Error('DISABLED');
      if (this.cancelled) throw new Error('CANCELLED');
      await this.adapter.start();
      if (this.cancelled) throw new Error('CANCELLED');
      this.requesting = true;
      this.onPhase?.('waiting');
      await this.adapter.request();
      if (this.cancelled) throw new Error('CANCELLED');
      const tag = await this.adapter.tag();
      if (this.cancelled) throw new Error('CANCELLED');
      if (!tag) throw new Error('NO_TAG');
      if (mode === 'read') {
        this.onPhase?.('reading');
        const decoded = decodeNfcIdentifier(await this.adapter.read());
        if (this.cancelled) throw new Error('CANCELLED');
        if (!decoded) throw new Error('INVALID_TAG');
        return decoded;
      }
      this.onPhase?.('checkingTag');
      const status = await this.adapter.status();
      if (this.cancelled) throw new Error('CANCELLED');
      if (!status.writable || tag.isWritable === false) throw new Error('READ_ONLY');
      if (!bytes || bytes.length > status.capacity || (typeof tag.maxSize === 'number' && bytes.length > tag.maxSize)) throw new Error('CAPACITY');
      this.inFlightWrite = true;
      try {
        this.onPhase?.('writing');
        await this.adapter.write(bytes);
        this.onPhase?.('verifying');
        const decoded = decodeNfcIdentifier(await this.adapter.read());
        if (!decoded || decoded !== objectIdFromQr(value ?? '')) throw new Error('VERIFY_FAILED');
        return decoded;
      } catch { throw new Error('WRITE_UNCONFIRMED'); }
      finally { this.inFlightWrite = false; }
    } catch (error) {
      if (this.cancelled && !this.inFlightWrite) throw new Error('CANCELLED');
      throw error;
    } finally {
      if (this.requesting) await this.adapter.cancel().catch(() => {});
      this.requesting = false;
      this.busy = false;
    }
  }
}
