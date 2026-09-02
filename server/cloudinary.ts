import { v2 as cloudinary } from 'cloudinary';

let configured = false;

export function configureCloudinary() {
  if (configured) return;
  configured = true;

  const config: Record<string, string | undefined> = {};

  if (process.env.CLOUDINARY_URL) {
    const parts = process.env.CLOUDINARY_URL.match(/^([^:]+):([^@]+)@(.+)$/);
    if (parts) {
      config.cloud_name = parts[1];
      config.api_key = parts[2];
      config.api_secret = parts[3];
    }
  }

  config.cloud_name = config.cloud_name || process.env.CLOUDINARY_CLOUD_NAME;
  config.api_key = config.api_key || process.env.CLOUDINARY_API_KEY;
  config.api_secret = config.api_secret || process.env.CLOUDINARY_API_SECRET;

  console.log('[cloudinary] Config:', {
    cloud_name: config.cloud_name ? '✓' : '✗',
    api_key: config.api_key ? '✓' : '✗',
    api_secret: config.api_secret ? '✓' : '✗',
  });

  cloudinary.config(config as any);
}

export default cloudinary;
