import { useLocalSearchParams } from 'expo-router';
import { QrScreenView } from '../../../../src/QrCard';
import { objectLink } from '../../../../src/qr';

// The QR of a company object holds the same memoratag://objeto/<id> link as the personal ones.
export default function CompanyQr() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  return <QrScreenView name={name ?? 'Objeto de la empresa'} value={objectLink(id)} />;
}
