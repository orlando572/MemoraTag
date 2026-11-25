import type { Metadata } from 'next';
import { Brand } from '@/components/brand';
import { LoginForm } from '@/features/auth/login-form';

export const metadata: Metadata = { title: 'Entrar' };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <Brand />
      <h1 className="mt-12 text-center font-heading text-4xl font-semibold tracking-[-0.03em] text-balance md:text-5xl">
        Tu empresa, con memoria
      </h1>
      <p className="mt-3 max-w-md text-center text-lg text-muted-foreground">Entra para gestionar tu inventario y tu equipo.</p>
      <div className="mt-10 w-full max-w-[440px] rounded-xl border border-border bg-card p-6 md:p-8">
        <LoginForm />
      </div>
    </main>
  );
}
