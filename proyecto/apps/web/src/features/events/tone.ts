export type Tone = 'neutral' | 'danger' | 'warning' | 'success';

export const toneClasses: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  danger: 'bg-danger-soft text-destructive',
  warning: 'bg-warning-soft text-warning',
  success: 'bg-success-soft text-success',
};
