import { useLocalSearchParams } from 'expo-router';
import { CompanyEventForm } from '../../../../src/company/EventForm';

export default function CompanyEvent() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  return <CompanyEventForm objectId={id} objectName={name ?? 'Objeto de la empresa'} />;
}
