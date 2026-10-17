import { useState } from 'react';
import { errorMessage } from '@/services/api';
import { uploadToStorage, useRequestUploadMutation } from './lms-api';
import { MAX_UPLOAD_MB } from './types';

/** Checks the file, gets an upload token and sends the file to storage. Returns its path. */
export function useUpload(
  purpose: 'material' | 'assignment',
  allowedTypes: string[],
) {
  const [requestUpload] = useRequestUploadMutation();
  const [uploading, setUploading] = useState(false);

  const upload = async (moduleId: string, file: File): Promise<string> => {
    if (!allowedTypes.includes(file.type)) {
      throw new Error(
        purpose === 'material'
          ? 'Choose a PDF, MP4 video or image'
          : 'Choose a PDF or image',
      );
    }
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024)
      throw new Error(`Files can be up to ${MAX_UPLOAD_MB} MB`);
    setUploading(true);
    try {
      const result = await requestUpload({
        moduleId,
        fileName: file.name,
        contentType: file.type,
        size: file.size,
        purpose,
      });
      if (result.error) throw new Error(errorMessage(result.error));
      await uploadToStorage(result.data.path, result.data.token, file);
      return result.data.path;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading };
}
