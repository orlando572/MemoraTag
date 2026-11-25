'use client';

import type { Member, Role } from '@memoratag/contracts';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { UserMinus, UserPlus } from 'lucide-react';
import { ErrorAlert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { roleInfo } from '@/features/organization/roles';
import { useToast } from '@/features/toast/toast';
import { errorMessage } from '@/lib/api';
import { browserApi } from '@/lib/api-client';

const lastAdmin = 'No se puede: tiene que quedar al menos un administrador en la empresa.';
const roles = Object.keys(roleInfo) as Role[];

function AddMemberForm({ orgId }: { orgId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await browserApi().organizations.addMember(orgId, { email, role });
      setEmail('');
      toast('Miembro añadido');
      router.refresh();
    } catch (failure) {
      setError(
        errorMessage(failure, {
          404: 'Esa persona aún no tiene cuenta en MemoraTag; pídele que se registre primero.',
          409: 'Esa persona ya es miembro de la empresa.',
        }),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardTitle>Añadir a una persona</CardTitle>
      <CardDescription>Debe haberse registrado antes en MemoraTag con ese correo.</CardDescription>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_200px]">
          <div className="space-y-2">
            <Label htmlFor="member-email">Correo electrónico</Label>
            <Input id="member-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="persona@empresa.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="member-role">Rol</Label>
            <Select id="member-role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {roles.map((key) => (
                <option key={key} value={key}>
                  {roleInfo[key].label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {error ? <ErrorAlert>{error}</ErrorAlert> : null}
        <Button type="submit" disabled={busy || !email.trim()}>
          <UserPlus aria-hidden />
          {busy ? 'Añadiendo…' : 'Añadir'}
        </Button>
      </form>
    </Card>
  );
}

function MemberRow({ orgId, member, isSelf }: { orgId: string; member: Member; isSelf: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function changeRole(role: Role) {
    setBusy(true);
    setError(null);
    try {
      await browserApi().organizations.changeRole(orgId, member.user_id, role);
      toast('Rol actualizado');
      router.refresh();
    } catch (failure) {
      setError(errorMessage(failure, { 409: lastAdmin }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-accent-foreground" aria-hidden>
            {member.email.charAt(0).toUpperCase()}
          </span>
          <span className="truncate font-semibold">{member.email}</span>
          {isSelf ? <Badge tone="primary">Tú</Badge> : null}
        </div>
        <div className="flex items-center gap-2">
          <Select aria-label={`Rol de ${member.email}`} className="w-44" value={member.role} disabled={busy} onChange={(e) => changeRole(e.target.value as Role)}>
            {roles.map((key) => (
              <option key={key} value={key}>
                {roleInfo[key].label}
              </option>
            ))}
          </Select>
          <Button variant="ghost" size="icon" aria-label={`Quitar a ${member.email}`} title="Quitar de la empresa" onClick={() => setRemoving(true)}>
            <UserMinus className="size-5" aria-hidden />
          </Button>
        </div>
      </div>
      {error ? <ErrorAlert className="mt-3">{error}</ErrorAlert> : null}
      <ConfirmDialog
        open={removing}
        onOpenChange={setRemoving}
        title={isSelf ? '¿Salir de la empresa?' : '¿Quitar a esta persona?'}
        description={isSelf ? 'Perderás el acceso a esta empresa.' : `${member.email} perderá el acceso a esta empresa.`}
        confirmLabel={isSelf ? 'Salir' : 'Quitar'}
        errorOverrides={{ 409: lastAdmin }}
        onConfirm={async () => {
          await browserApi().organizations.removeMember(orgId, member.user_id);
          toast(isSelf ? 'Has salido de la empresa' : 'Miembro quitado');
          router.refresh();
        }}
      />
    </li>
  );
}

export function MembersView({ orgId, currentUserId, members }: { orgId: string; currentUserId: string; members: Member[] }) {
  const sorted = [...members].sort((a, b) => a.email.localeCompare(b.email, 'es'));
  return (
    <div className="grid max-w-3xl gap-6">
      <AddMemberForm orgId={orgId} />
      <Card>
        <CardTitle>Equipo ({members.length})</CardTitle>
        <CardDescription>Los administradores gestionan todo. Los miembros consultan, cambian estados y registran eventos.</CardDescription>
        <ul className="mt-4 divide-y divide-border">
          {sorted.map((member) => (
            <MemberRow key={member.user_id} orgId={orgId} member={member} isSelf={member.user_id === currentUserId} />
          ))}
        </ul>
      </Card>
    </div>
  );
}
