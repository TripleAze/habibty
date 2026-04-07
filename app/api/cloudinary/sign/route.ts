import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const { type } = await request.json();

    const resourceType = type === 'video' ? 'video' : 'auto';

    const timestamp = Math.round(Date.now() / 1000);

    const params = {
      timestamp,
      folder: 'romantic-messages',
    };

    if (!process.env.CLOUDINARY_API_SECRET) {
      throw new Error('CLOUDINARY_API_SECRET is not defined');
    }

    const signature = cloudinary.utils.api_sign_request(
      params,
      process.env.CLOUDINARY_API_SECRET
    );

    return NextResponse.json({
      signature,
      timestamp,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      folder: 'romantic-messages',
      resourceType,
    });
  } catch (error) {
    console.error('Cloudinary signing error:', error);
    return NextResponse.json(
      { error: 'Failed to sign upload request' },
      { status: 500 }
    );
  }
}
