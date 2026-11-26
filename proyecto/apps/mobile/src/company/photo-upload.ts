import * as FileSystem from 'expo-file-system/legacy';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { CompanyError } from './errors';
import { uploadResize } from './files';

type PickedPhoto = { uri: string; width?: number; height?: number };

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Shrinks a picked photo (longest side 1600 px, JPEG at 70 %) so it uploads fast and stays under the 5 MB limit.
 * Camera photos of current phones often weigh 5–10 MB; sending them as they are fails mid-upload.
 * Throws CompanyError('too_large') if, even so, the result is over 5 MB.
 */
export async function preparePhotoForUpload(photo: PickedPhoto): Promise<{ uri: string; name: string; type: string }> {
  const context = ImageManipulator.manipulate(photo.uri);
  const resize = uploadResize(photo.width, photo.height);
  if (resize) context.resize(resize);
  const image = await context.renderAsync();
  const result = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
  const info = await FileSystem.getInfoAsync(result.uri);
  if (info.exists && typeof info.size === 'number' && info.size > MAX_BYTES) throw new CompanyError('too_large');
  return { uri: result.uri, name: 'foto.jpg', type: 'image/jpeg' };
}
