'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';

type Mode = 'login' | 'signup';

function translate(message: string) {
  const text = message.toLowerCase();
  if (text.includes('invalid login')) return 'El correo o la contraseña no son correctos.';
  if (text.includes('already registered')) return 'Ya existe una cuenta con ese correo. Prueba a iniciar sesión.';
  if (text.includes('password should be')) return 'La contraseña es demasiado corta. Usa al menos 6 caracteres.';
  if (text.includes('email not confirmed')) return 'Confirma tu correo antes de entrar. Revisa tu bandeja de entrada.';
  if (text.includes('rate limit')) return 'Demasiados intentos. Espera un momento y vuelve a probar.';
  return 'No se pudo completar la acción. Inténtalo de nuevo.';
}

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const supabase = createClient();
    const credentials = { email: email.trim(), password };
    const { data, error: failure } =
      mode === 'login' ? await supabase.auth.signInWithPassword(credentials) : await supabase.auth.signUp(credentials);
    setBusy(false);
    if (failure) return setError(translate(failure.message));
    if (data.session) {
      router.replace('/resumen');
      router.refresh();
    } else {
      setNotice('Te hemos enviado un correo para confirmar tu cuenta. Después podrás iniciar sesión.');
    }
  }

  const signup = mode === 'signup';
  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate={false}>
      <div className="space-y-2">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@empresa.com" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          type="password"
          autoComplete={signup ? 'new-password' : 'current-password'}
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {signup ? <p className="text-sm text-muted-foreground">Mínimo 6 caracteres.</p> : null}
      </div>
      {error ? <ErrorAlert>{error}</ErrorAlert> : null}
      {notice ? (
        <div role="status" className="flex items-start gap-2.5 rounded-md bg-success-soft px-4 py-3 text-sm font-medium text-success">
          <MailCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{notice}</span>
        </div>
      ) : null}
      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? 'Un momento…' : signup ? 'Crear cuenta' : 'Entrar'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {signup ? '¿Ya tienes cuenta?' : '¿Aún no tienes cuenta?'}{' '}
        <button
          type="button"
          className="rounded-sm font-semibold text-primary underline-offset-4 hover:underline"
          onClick={() => {
            setMode(signup ? 'login' : 'signup');
            setError(null);
            setNotice(null);
          }}
        >
          {signup ? 'Inicia sesión' : 'Crea una'}
        </button>
      </p>
    </form>
  );
}
