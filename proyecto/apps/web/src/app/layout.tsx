import type { Metadata } from 'next';
import { DM_Sans, Fraunces } from 'next/font/google';
import { ToastProvider } from '@/features/toast/toast';
import { themeInitScript } from '@/features/theme/theme';
import './globals.css';

const fraunces = Fraunces({ subsets: ['latin'], weight: '600', variable: '--font-fraunces', display: 'swap' });
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-dm-sans', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'MemoraTag', template: '%s · MemoraTag' },
  description: 'El centro de gestión de tu empresa: inventario, equipo y resumen en un solo lugar.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${fraunces.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
