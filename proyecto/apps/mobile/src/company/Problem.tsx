import { router } from 'expo-router';
import { EmptyState } from '../ui/components';
import { companyMessage, type CompanyErrorKind } from './errors';

/** Clear state for a failed company request: offline gets «Reintentar», an expired session leads to Ajustes. */
export function CompanyProblem({ kind, onRetry }: { kind: CompanyErrorKind; onRetry: () => void }) {
  if (kind === 'auth') return <EmptyState icon="log-in-outline" title="Inicia sesión de nuevo" text={companyMessage(kind)} action={{ label: 'Ir a Ajustes', icon: 'settings-outline', onPress: () => router.push('/settings') }} />;
  const offline = kind === 'offline';
  return <EmptyState icon={offline ? 'cloud-offline-outline' : 'alert-circle-outline'} title={offline ? 'Sin conexión' : 'No se pudo cargar'} text={companyMessage(kind)} action={{ label: 'Reintentar', icon: 'refresh', onPress: onRetry }} />;
}
