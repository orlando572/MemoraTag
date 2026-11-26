import { useLocalSearchParams } from 'expo-router';
import { CompanyObjectScreen } from '../../../../src/company/ObjectScreen';

export default function CompanyObject() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CompanyObjectScreen id={id} />;
}
