export interface CloudinaryUploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  format: string;
  resourceType: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export async function uploadToCloudinary(
  file: File,
  type: 'audio' | 'video',
  onProgress?: (progress: UploadProgress) => void
): Promise<CloudinaryUploadResult> {
  // Get signature from our API
  const signResponse = await fetch('/api/cloudinary/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type }),
  });

  if (!signResponse.ok) {
    throw new Error('Failed to get upload signature');
  }

  const { signature, timestamp, apiKey, cloudName, folder, resourceType } =
    await signResponse.json();

  // Create form data for upload
  const formData = new FormData();
  formData.append('file', file);
  formData.append('signature', signature);
  formData.append('timestamp', timestamp.toString());
  formData.append('api_key', apiKey);
  formData.append('folder', folder);
  formData.append('resource_type', resourceType);

  // Upload to Cloudinary
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percentage: Math.round((event.loaded / event.total) * 100),
        });
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const result = JSON.parse(xhr.responseText);
        resolve({
          url: result.secure_url,
          secureUrl: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          resourceType: result.resource_type,
        });
      } else {
        reject(new Error('Upload failed'));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Upload failed'));
    };

    xhr.send(formData);
  });
}

export function getOptimizedCloudinaryUrl(
  url: string,
  options?: {
    width?: number;
    quality?: 'auto' | 'low' | 'medium' | 'high' | 'best';
    format?: 'auto' | 'webp' | 'mp4';
  }
): string {
  if (!url.includes('cloudinary.com')) {
    return url;
  }

  const transformations: string[] = [];

  if (options?.width) {
    transformations.push(`w_${options.width}`);
  }

  if (options?.quality) {
    transformations.push(`q_${options.quality}`);
  }

  if (options?.format) {
    transformations.push(`f_${options.format}`);
  }

  if (transformations.length === 0) {
    transformations.push('q_auto', 'f_auto');
  }

  const transformationString = transformations.join(',');

  // Insert transformations before the upload path
  return url.replace(
    '/upload/',
    `/upload/${transformationString}/`
  );
}

export function getCloudinaryVideoUrl(
  publicId: string,
  options?: {
    width?: number;
    quality?: 'auto' | 'low' | 'medium' | 'high' | 'best';
  }
): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const transformations: string[] = ['q_auto', 'f_auto'];

  if (options?.width) {
    transformations.unshift(`w_${options.width}`);
  }

  if (options?.quality) {
    transformations.push(`q_${options.quality}`);
  }

  return `https://res.cloudinary.com/${cloudName}/video/upload/${transformations.join(',')}/${publicId}`;
}

export function getCloudinaryAudioUrl(
  publicId: string,
  options?: {
    quality?: 'auto' | 'low' | 'medium' | 'high' | 'best';
  }
): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const transformations: string[] = ['q_auto', 'f_auto'];

  if (options?.quality) {
    transformations.push(`q_${options.quality}`);
  }

  return `https://res.cloudinary.com/${cloudName}/video/upload/${transformations.join(',')}/${publicId}`;
}
