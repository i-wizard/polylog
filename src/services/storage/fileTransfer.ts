import { Logger } from '../../utils/logger';

/**
 * Hands a file to the user. On iPhone the share sheet ("Save to Files",
 * AirDrop, iCloud) is far more usable than a download link, so it is
 * preferred whenever the browser supports sharing files.
 */
export async function saveFile({ file }: { file: File }): Promise<void> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      Logger.warn('Share failed; falling back to download', error);
    }
  }

  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(url);
}
