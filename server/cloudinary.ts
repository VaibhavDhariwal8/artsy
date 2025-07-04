import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Debug: Check configuration (run once)
console.log('🔧 Cloudinary configuration check:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? '✅ Set' : '❌ Missing',
  api_key: process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Missing',
  api_secret: process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Missing'
});

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export const uploadToCloudinary = async (filePath: string, filename: string): Promise<CloudinaryUploadResult> => {
  try {
    console.log(`🔄 Starting Cloudinary upload for: ${filename}`);
    console.log(`📁 Local file path: ${filePath}`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'smarttasktracker/artworks',
      public_id: filename.split('.')[0], // Use filename without extension
      resource_type: 'image',
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' }, // Limit max size
        { quality: 'auto' }, // Auto quality optimization
        { fetch_format: 'auto' } // Auto format optimization
      ]
    });

    console.log(`✅ Cloudinary upload successful:`, {
      public_id: result.public_id,
      secure_url: result.secure_url,
      width: result.width,
      height: result.height
    });

    // Clean up local file after successful upload
    try {
      fs.unlinkSync(filePath);
      console.log(`✅ Local file deleted: ${filePath}`);
    } catch (cleanupError) {
      console.warn(`⚠️ Failed to delete local file: ${filePath}`, cleanupError);
    }

    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes
    };
  } catch (error) {
    console.error('❌ Cloudinary upload failed:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      cloudinaryConfig: {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY ? '***' + process.env.CLOUDINARY_API_KEY.slice(-4) : 'NOT_SET',
        api_secret: process.env.CLOUDINARY_API_SECRET ? '***' + process.env.CLOUDINARY_API_SECRET.slice(-4) : 'NOT_SET'
      }
    });
    throw new Error(`Failed to upload image to Cloudinary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
    console.log(`✅ Cloudinary image deleted: ${publicId}`);
  } catch (error) {
    console.error('❌ Failed to delete from Cloudinary:', error);
    throw new Error('Failed to delete image from Cloudinary');
  }
};

export { cloudinary };
