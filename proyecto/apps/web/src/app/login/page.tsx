import type { Metadata } from 'next';
import Image from 'next/image';
import { SkipLink } from '@/components/skip-link';
import { Brand } from '@/components/brand';
import { LoginForm } from '@/features/auth/login-form';

export const metadata: Metadata = { title: 'Entrar' };

export default function LoginPage() {
  return (
    <>
      <SkipLink />
      <main id="contenido" className="grid min-h-screen lg:grid-cols-2">
      {/* Photo: low strip on mobile, full-height column on large screens */}
      <section className="relative h-32 overflow-hidden bg-muted sm:h-44 lg:h-auto lg:min-h-screen">
        <Image
          src="/login/almacen.webp"
          alt="Pasillo de un almacén con altas estanterías azules llenas de cajas"
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover object-center"
        />
        {/* Fixed dark gradient (not theme-dependent) so white text keeps contrast on the photo */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-4 lg:p-12">
          <p className="hidden max-w-md font-heading text-4xl font-semibold tracking-[-0.03em] text-balance text-white lg:block xl:text-5xl">
            Cada objeto tiene su historia.
          </p>
          <p className="text-xs text-white/85">
            Foto:{' '}
            <a href="https://unsplash.com/photos/yqu6tJkSQ_k" target="_blank" rel="noreferrer" className="rounded-sm underline underline-offset-2 hover:text-white">
              Arno Senoner / Unsplash
            </a>
          </p>
        </div>
      </section>

      <section className="flex flex-col items-center justify-center px-6 py-10 lg:py-16">
        <Brand />
        <LoginForm />
      </section>
      </main>
    </>
  );
}
