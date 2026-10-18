import { useState } from 'react';
import { errorMessage } from '@/services/api';
import {
  uploadToStorage,
  useGetUploadLimitQuery,
  useRequestUploadMutation,
} from './lms-api';

/** Checks the file, gets an upload token and sends the file to storage. Returns its path. */
export function useUpload(
  purpose: 'material' | 'assignment',
  allowedTypes: string[],
) {
  // The API owns the limit (it must match the storage bucket's); it re-checks every request.
  const maxMb = useGetUploadLimitQuery().data?.maxMb;
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
    if (maxMb && file.size > maxMb * 1024 * 1024)
      throw new Error(`Files can be up to ${maxMb} MB`);
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

  return { upload, uploading, maxMb };
}
