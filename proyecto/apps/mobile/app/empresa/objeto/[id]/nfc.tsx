import { useLocalSearchParams } from 'expo-router';
import { NfcScreen } from '../../../../src/NfcScreen';
import { markCompanyNfcWritten } from '../../../../src/company/api';
import { useCompany } from '../../../../src/company/CompanyProvider';
import { canWriteNfc } from '../../../../src/company/files';
import { ErrorMessage, NavBar, Screen } from '../../../../src/ui/components';

// Writes memoratag://objeto/<id> for a company object. Admin only; nothing is saved in the backend yet.
export default function WriteCompanyNfc() {
  const { id, name, nfc } = useLocalSearchParams<{ id: string; name?: string; nfc?: string }>();
  const { org } = useCompany();
  if (!canWriteNfc(org?.role)) return <Screen><NavBar title="Etiqueta NFC" /><ErrorMessage text="Solo los administradores de la empresa pueden escribir etiquetas NFC." /></Screen>;
  return <NfcScreen company object={{ id, name: name ?? 'Objeto de la empresa', nfc_written_at: nfc || null }} onCompanyWritten={markCompanyNfcWritten} />;
}
