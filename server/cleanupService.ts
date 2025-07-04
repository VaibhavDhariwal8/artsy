import fs from 'fs';
import path from 'path';

const uploadsDir = path.join(process.cwd(), 'uploads');
const TEMP_FILE_MAX_AGE = 60 * 60 * 1000; // 1 hour in milliseconds

export const cleanupOrphanedTempFiles = () => {
  try {
    if (!fs.existsSync(uploadsDir)) {
      return;
    }

    const files = fs.readdirSync(uploadsDir);
    const tempFiles = files.filter(file => file.startsWith('temp_'));
    
    if (tempFiles.length === 0) {
      return;
    }

    console.log(`🧹 Checking ${tempFiles.length} temporary files for cleanup...`);
    
    let cleanedCount = 0;
    
    tempFiles.forEach(file => {
      const filePath = path.join(uploadsDir, file);
      const stats = fs.statSync(filePath);
      const fileAge = Date.now() - stats.mtime.getTime();
      
      if (fileAge > TEMP_FILE_MAX_AGE) {
        try {
          fs.unlinkSync(filePath);
          cleanedCount++;
          console.log(`🗑️ Cleaned up old temp file: ${file}`);
        } catch (error) {
          console.warn(`⚠️ Failed to cleanup temp file: ${file}`, error);
        }
      }
    });
    
    if (cleanedCount > 0) {
      console.log(`✅ Cleaned up ${cleanedCount} orphaned temporary files`);
    }
  } catch (error) {
    console.error('❌ Error during temp file cleanup:', error);
  }
};

// Start cleanup interval (every 30 minutes)
export const startCleanupInterval = () => {
  console.log('🚀 Starting temporary file cleanup service...');
  
  // Run cleanup immediately
  cleanupOrphanedTempFiles();
  
  // Then run every 30 minutes
  setInterval(cleanupOrphanedTempFiles, 30 * 60 * 1000);
};
