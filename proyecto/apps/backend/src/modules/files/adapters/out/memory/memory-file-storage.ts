import type { FileStorage } from '../../../application/ports';

export class MemoryFileStorage implements FileStorage {
  readonly blobs = new Map<string, { bytes: Buffer; mime: string }>();

  async put(path: string, bytes: Buffer, mime: string) {
    this.blobs.set(path, { bytes, mime });
  }
  async signedUrl(path: string, seconds: number) {
    return `memory://${path}?expires_in=${seconds}`;
  }
  async remove(path: string) {
    this.blobs.delete(path);
  }
}
