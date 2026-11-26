'use client';

import type { Member, Role } from '@memoratag/contracts';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { LoaderCircle, UserMinus, UserPlus } from 'lucide-react';
import { ErrorAlert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Field, RequiredNote } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { roleInfo } from '@/features/organization/roles';
import { useToast } from '@/features/toast/toast';
import { errorMessage } from '@/lib/api';
import { browserApi } from '@/lib/api-client';

const lastAdmin = 'No se puede: tiene que quedar al menos un administrador en la empresa.';
const roles = Object.keys(roleInfo) as Role[];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function AddMemberForm({ orgId }: { orgId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const value = email.trim();
    const problem = !value ? 'Escribe el correo de la persona.' : !emailPattern.test(value) ? 'El correo no tiene un formato válido.' : null;
    setEmailError(problem);
    if (problem) return document.getElementById('member-email')?.focus();
    setBusy(true);
    try {
      await browserApi().organizations.addMember(orgId, { email: value, role });
      setEmail('');
      toast('Miembro añadido');
      router.refresh();
    } catch (failure) {
      setError(
        errorMessage(failure, {
          404: 'Esa persona aún no tiene cuenta. Pídele que se registre en MemoraTag y elija "Me van a añadir".',
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
      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_200px]">
          <Field id="member-email" label="Correo electrónico" required error={emailError}>
            {(p) => <Input {...p} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="persona@empresa.com" />}
          </Field>
          <Field id="member-role" label="Rol">
            {(p) => (
              <Select {...p} value={role} onChange={(e) => setRole(e.target.value as Role)}>
                {roles.map((key) => (
                  <option key={key} value={key}>
                    {roleInfo[key].label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <RequiredNote />
        {error ? <ErrorAlert>{error}</ErrorAlert> : null}
        <Button type="submit" disabled={busy}>
          {busy ? <LoaderCircle className="animate-spin" aria-hidden /> : <UserPlus aria-hidden />}
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
  const [demoting, setDemoting] = useState(false);

  async function applyRole(role: Role) {
    await browserApi().organizations.changeRole(orgId, member.user_id, role);
    toast('Rol actualizado');
    router.refresh();
  }

  async function onRoleChange(role: Role) {
    // Taking admin rights away is confirmed first; any other change applies directly.
    if (member.role === 'admin' && role === 'member') return setDemoting(true);
    setBusy(true);
    setError(null);
    try {
      await applyRole(role);
    } catch (failure) {
      setError(errorMessage(failure, { 409: lastAdmin }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-full min-w-0 items-center gap-3 sm:w-auto sm:flex-1">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-accent-foreground" aria-hidden>
            {member.email.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 truncate font-semibold" title={member.email}>
            {member.email}
          </span>
          {isSelf ? <Badge tone="primary">Tú</Badge> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select aria-label={`Rol de ${member.email}`} className="w-44" value={member.role} disabled={busy} onChange={(e) => onRoleChange(e.target.value as Role)}>
            {roles.map((key) => (
              <option key={key} value={key}>
                {roleInfo[key].label}
              </option>
            ))}
          </Select>
          <Button variant="ghost" aria-label={`Quitar a ${member.email}`} onClick={() => setRemoving(true)}>
            <UserMinus aria-hidden />
            Quitar
          </Button>
        </div>
      </div>
      {error ? <ErrorAlert className="mt-3">{error}</ErrorAlert> : null}
      <ConfirmDialog
        open={demoting}
        onOpenChange={setDemoting}
        title="¿Quitar permisos de administrador?"
        description={isSelf ? 'Pasarás a ser miembro y dejarás de gestionar la empresa.' : `${member.email} pasará a ser miembro y dejará de gestionar la empresa.`}
        confirmLabel="Pasar a miembro"
        errorOverrides={{ 409: lastAdmin }}
        onConfirm={() => applyRole('member')}
      />
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
    <div className="grid min-w-0 max-w-3xl grid-cols-1 gap-6">
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
