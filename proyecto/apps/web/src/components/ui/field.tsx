import type { ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';
import { Label } from '@/components/ui/label';

type ControlProps = { id: string; 'aria-invalid'?: true; 'aria-describedby'?: string };

type FieldProps = {
  id: string;
  label: string;
  required?: boolean;
  error?: string | null;
  hint?: string;
  children: (props: ControlProps) => ReactNode;
};

// Label + control + hint + inline error. Required fields end their label with « *».
export function Field({ id, label, required, error, hint, children }: FieldProps) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id}>
        {label}
        {required ? <span aria-hidden> *</span> : null}
      </Label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="flex items-start gap-1.5 text-sm font-semibold text-destructive">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

export function RequiredNote() {
  return <p className="text-xs text-muted-foreground">* Obligatorio</p>;
}

/** Moves focus to the first field with an error (ids in form order). */
export function focusFirstError(errors: Record<string, string | undefined>, order: string[]) {
  const id = order.find((key) => errors[key]);
  if (id) document.getElementById(id)?.focus();
}
