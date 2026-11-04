import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Linking, Platform } from 'react-native';
import { documentFormat } from '../event-document';
import type { useFeedback } from '../ui/feedback/FeedbackProvider';

type Feedback = ReturnType<typeof useFeedback>;
const MAX = 5 * 1024 * 1024;

/** Lets the user take or choose a photo (≤ 5 MB). Resolves null when cancelled. */
export function pickPhoto(Alert: Feedback, title: string): Promise<ImagePicker.ImagePickerAsset | null> {
  return new Promise((resolve) => {
    async function choose(source: 'camera' | 'gallery') {
      try {
        if (source === 'camera') {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) {
            Alert.alert('Acceso a la cámara', permission.canAskAgain ? 'Permite el acceso a la cámara para tomar una foto.' : 'Activa el permiso de cámara en los ajustes del teléfono.', permission.canAskAgain ? [{ text: 'Entendido' }] : [{ text: 'Cancelar', style: 'cancel' }, { text: 'Abrir ajustes', onPress: () => void Linking.openSettings() }]);
            return resolve(null);
          }
        }
        const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
        const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
        if (result.canceled) return resolve(null);
        const asset = result.assets[0];
        if (asset.fileSize && asset.fileSize > MAX) {
          Alert.error('Imagen demasiado grande', 'Elige una imagen de hasta 5 MB.', [{ text: 'Cancelar', style: 'cancel', onPress: () => resolve(null) }, { text: 'Elegir otra imagen', onPress: () => void choose(source) }]);
          return;
        }
        resolve(asset);
      } catch { Alert.error('No se pudo abrir la imagen', 'Vuelve a intentarlo.'); resolve(null); }
    }
    Alert.sheet(title, 'Elige de dónde quieres añadirla.', [
      { text: 'Tomar foto', icon: 'camera-outline', onPress: () => void choose('camera') },
      { text: 'Elegir de la galería', icon: 'images-outline', onPress: () => void choose('gallery') },
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}

/** Lets the user choose a PDF, XLS or XLSX (≤ 5 MB). Resolves null when cancelled or invalid. */
export async function pickDocument(Alert: Feedback): Promise<DocumentPicker.DocumentPickerAsset | null> {
  try {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'], copyToCacheDirectory: Platform.OS !== 'android', multiple: false });
    if (result.canceled) return null;
    const asset = result.assets[0];
    if (!documentFormat(asset.name)) { Alert.error('Formato no admitido', 'Elige un archivo PDF, XLS o XLSX.'); return null; }
    if (asset.size != null && asset.size > MAX) { Alert.error('Archivo demasiado grande', 'Elige un documento de hasta 5 MB.'); return null; }
    return asset;
  } catch { Alert.error('No se pudo seleccionar el archivo', 'Vuelve a intentarlo.'); return null; }
}

export const saveErrors: Record<string, string> = {
  SIZE: 'Elige una imagen de hasta 5 MB.', FORMAT: 'Elige una imagen JPEG, PNG, WebP o HEIC.',
  DOCUMENT_SIZE: 'Elige un documento de hasta 5 MB.', DOCUMENT_FORMAT: 'Elige un archivo PDF, XLS o XLSX.',
  DOCUMENT_READ: 'No se puede leer el documento seleccionado. Vuelve a seleccionarlo desde el dispositivo.',
  DOCUMENT_SOURCE_INFO: 'No se puede consultar el documento seleccionado. Vuelve a seleccionarlo.',
  DOCUMENT_SOURCE_COPY: 'No se puede acceder al documento seleccionado para copiarlo. Vuelve a seleccionarlo.',
  DOCUMENT_DIRECTORY: 'No se puede preparar la carpeta local para documentos.',
  DOCUMENT_WRITE: 'No se puede escribir el documento en el almacenamiento local.',
  DOCUMENT_VERIFY: 'No se pudo verificar la copia del documento. Vuelve a seleccionarlo.',
};
