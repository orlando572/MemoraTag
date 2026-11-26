import type { CurrentUser } from '../../../domain/current-user';
import type { UserDirectory } from '../../../application/ports';

export class MemoryUserDirectory implements UserDirectory {
  private readonly users = new Map<string, CurrentUser>();

  async remember(user: CurrentUser) {
    this.users.set(user.id, user);
  }
  async findByEmail(email: string) {
    return [...this.users.values()].find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
  }
  async findByIds(ids: string[]) {
    return ids.flatMap((id) => this.users.get(id) ?? []);
  }
}
