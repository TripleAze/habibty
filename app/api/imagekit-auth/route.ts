import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET() {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  
  if (!privateKey) {
    return NextResponse.json({ error: 'ImageKit Private Key not found' }, { status: 500 });
  }

  // Generate a random token
  const token = crypto.randomBytes(20).toString('hex');
  // Set expiration time (e.g., 30 minutes from now)
  const expire = Math.floor(Date.now() / 1000) + 1800;
  
  // Create HMAC-SHA1 signature
  const signature = crypto
    .createHmac('sha1', privateKey)
    .update(token + expire)
    .digest('hex');

  return NextResponse.json({
    token,
    expire,
    signature,
  });
}
