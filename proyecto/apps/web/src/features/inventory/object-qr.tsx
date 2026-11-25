'use client';

import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { objectLink } from './qr';

type Props = { id: string; name: string; code?: string | null };

const slug = (text: string) => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'objeto';

export function ObjectQr({ id, name, code }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const link = objectLink(id);

  useEffect(() => {
    let active = true;
    // Always dark on white so it scans in either theme.
    QRCode.toDataURL(link, { width: 1024, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#FFFFFF' } }).then((url) => active && setSrc(url));
    return () => {
      active = false;
    };
  }, [link]);

  function download() {
    if (!src) return;
    const anchor = document.createElement('a');
    anchor.href = src;
    anchor.download = `qr-${slug(name)}.png`;
    anchor.click();
  }

  function print() {
    const root = document.documentElement;
    root.dataset.print = 'label';
    window.addEventListener('afterprint', () => delete root.dataset.print, { once: true });
    window.print();
  }

  return (
    <div>
      <div className="mx-auto w-full max-w-[220px] rounded-lg border border-border bg-white p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {src ? <img src={src} alt={`Código QR de ${name}`} className="aspect-square w-full" /> : <div className="aspect-square w-full" />}
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">La app móvil abre este objeto al escanearlo.</p>
      <div className="mt-4 flex flex-col gap-2">
        <Button variant="secondary" onClick={download} disabled={!src}>
          <Download aria-hidden />
          Descargar QR (PNG)
        </Button>
        <Button variant="secondary" onClick={print} disabled={!src}>
          <Printer aria-hidden />
          Imprimir etiqueta
        </Button>
      </div>

      <div className="print-label" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {src ? <img src={src} alt="" style={{ width: '6cm', height: '6cm' }} /> : null}
        <strong style={{ fontSize: 22 }}>{name}</strong>
        {code ? <span style={{ fontSize: 16 }}>{code}</span> : null}
      </div>
    </div>
  );
}
