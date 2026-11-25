'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useTransition, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Building2, Copy, UserPlus, type LucideIcon } from 'lucide-react';
import { Brand } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { SignOutButton } from '@/features/auth/sign-out-button';
import { useToast } from '@/features/toast/toast';
import { CreateOrganizationForm } from './create-organization';

function Choice({ href, icon: Icon, title, subtitle }: { href: string; icon: LucideIcon; title: string; subtitle: string }) {
  return (
    <Link href={href} className="group flex flex-col rounded-xl border border-border bg-card p-6 text-left transition-colors hover:bg-muted/60 md:p-8">
      <span className="flex size-12 items-center justify-center rounded-md bg-accent text-accent-foreground">
        <Icon className="size-6" aria-hidden />
      </span>
      <span className="mt-6 flex items-center justify-between gap-3 font-heading text-2xl font-semibold tracking-tight">
        {title}
        <ArrowRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden />
      </span>
      <span className="mt-1 text-muted-foreground">{subtitle}</span>
    </Link>
  );
}

function WaitForAdmin({ email }: { email: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const wasPending = useRef(false);

  // After the refresh, if this screen is still here the user has no company yet.
  useEffect(() => {
    if (wasPending.current && !pending) toast('Todavía no te han añadido');
    wasPending.current = pending;
  }, [pending, toast]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      toast('Correo copiado');
    } catch {
      toast('No se pudo copiar; selecciónalo a mano');
    }
  }

  return (
    <div className="w-full max-w-[440px] rounded-xl border border-border bg-card p-6 md:p-8">
      <p className="text-sm text-muted-foreground">Tu correo</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-accent px-4 py-3">
        <span className="break-all font-semibold text-accent-foreground">{email}</span>
        <Button variant="secondary" size="sm" onClick={copy}>
          <Copy aria-hidden />
          Copiar
        </Button>
      </div>
      <p className="mt-4 text-muted-foreground">Dáselo a tu administrador para que te añada en Miembros.</p>
      <Button size="lg" className="mt-6 w-full" disabled={pending} onClick={() => startTransition(() => router.refresh())}>
        {pending ? 'Comprobando…' : 'Ya me añadieron'}
      </Button>
    </div>
  );
}

export function Welcome({ email }: { email: string }) {
  const pathname = usePathname();
  const step = useSearchParams().get('paso');

  let title = '¿Cómo vas a usar MemoraTag?';
  let subtitle = 'Elige una opción para empezar.';
  let content: ReactNode = (
    <div className="grid w-full max-w-3xl gap-4 md:grid-cols-2 md:gap-6">
      <Choice href={`${pathname}?paso=crear`} icon={Building2} title="Crear mi empresa" subtitle="Serás el administrador" />
      <Choice href={`${pathname}?paso=unirme`} icon={UserPlus} title="Me van a añadir a una empresa" subtitle="Para trabajadores" />
    </div>
  );
  if (step === 'crear') {
    title = 'Crea tu empresa';
    subtitle = 'Será el espacio donde tu equipo gestiona el inventario.';
    content = <CreateOrganizationForm />;
  } else if (step === 'unirme') {
    title = 'Pide que te añadan';
    subtitle = 'Un administrador te añadirá con tu correo.';
    content = <WaitForAdmin email={email} />;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <Brand />
      <h1 className="mt-12 text-center font-heading text-4xl font-semibold tracking-[-0.03em] text-balance md:text-5xl">{title}</h1>
      <p className="mt-3 max-w-md text-center text-lg text-muted-foreground">{subtitle}</p>
      <div className="mt-10 flex w-full flex-col items-center">{content}</div>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        {step === 'crear' || step === 'unirme' ? (
          <Button asChild variant="ghost">
            <Link href={pathname}>
              <ArrowLeft aria-hidden />
              Volver
            </Link>
          </Button>
        ) : null}
        <SignOutButton variant="ghost" />
      </div>
    </main>
  );
}
