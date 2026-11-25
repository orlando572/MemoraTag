import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signOut } from './actions';

export function SignOutButton({ variant = 'secondary', className }: { variant?: 'secondary' | 'ghost'; className?: string }) {
  return (
    <form action={signOut}>
      <Button type="submit" variant={variant} className={className}>
        <LogOut aria-hidden />
        Cerrar sesión
      </Button>
    </form>
  );
}
