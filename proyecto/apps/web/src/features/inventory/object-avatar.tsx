'use client';

import { useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import { browserApi } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { objectColorIndex } from './colors';

type Props = {
  color: string;
  className?: string;
  /** With both, the object's photo replaces the icon (falls back to the icon while loading or on error). */
  objectId?: string;
  photoUpdatedAt?: string | null;
};

// Signed URLs last 5 minutes; one automatic renewal if the image fails to load.
function useObjectPhoto(objectId: string | undefined, version: string | null | undefined) {
  const [state, setState] = useState<{ key: string; url: string | null }>({ key: '', url: null });
  const [attempt, setAttempt] = useState(0);
  const key = objectId && version ? `${objectId}:${version}:${attempt}` : '';
  useEffect(() => {
    if (!key || !objectId) return;
    let cancelled = false;
    browserApi()
      .objects.photoUrl(objectId)
      .then(({ url }) => !cancelled && setState({ key, url }))
      .catch(() => !cancelled && setState({ key, url: null }));
    return () => {
      cancelled = true;
    };
  }, [key, objectId]);
  const url = state.key === key ? state.url : null;
  return { url, retry: () => attempt === 0 && setAttempt(1), clear: () => setState({ key, url: null }) };
}

export function ObjectAvatar({ color, className, objectId, photoUpdatedAt }: Props) {
  const i = objectColorIndex(color);
  const { url, retry, clear } = useObjectPhoto(objectId, photoUpdatedAt);
  return (
    <span
      aria-hidden
      className={cn('flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md', className)}
      style={{ background: `var(--obj-${i}-bg)`, color: `var(--obj-${i}-fg)` }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          className="size-full object-cover"
          onError={() => {
            clear();
            retry();
          }}
        />
      ) : (
        <Package className="size-[55%]" />
      )}
    </span>
  );
}
