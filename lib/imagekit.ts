import { upload as ikUpload } from '@imagekit/javascript';

export interface ImageKitAuthResponse {
  token: string;
  signature: string;
  expire: number;
  error?: string;
}

export async function getIKAuth(): Promise<ImageKitAuthResponse> {
  const response = await fetch('/api/imagekit-auth');
  return response.json();
}

export async function uploadMedia(file: File, fileName: string, folder: string = 'media') {
  const authData = await getIKAuth();
  
  if (authData.error) throw new Error(authData.error);

  const response = await ikUpload({
    file,
    fileName,
    folder,
    publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || '',
    signature: authData.signature,
    token: authData.token,
    expire: authData.expire,
  });

  return response;
}
