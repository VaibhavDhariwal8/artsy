import { storage } from './storage';

export class ArtworkExpirationService {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly checkInterval = 60000; // Check every minute

  start(): void {
    if (this.intervalId) {
      console.log('🔄 Artwork expiration service is already running');
      return;
    }

    console.log('🚀 Starting artwork expiration service...');
    
    // Process expired artworks immediately
    this.processExpiredArtworks();
    
    // Set up periodic processing
    this.intervalId = setInterval(() => {
      this.processExpiredArtworks();
    }, this.checkInterval);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⏹️ Artwork expiration service stopped');
    }
  }

  private async processExpiredArtworks(): Promise<void> {
    try {
      await storage.processExpiredArtworks();
    } catch (error) {
      console.error('❌ Error processing expired artworks:', error);
    }
  }
}

export const artworkExpirationService = new ArtworkExpirationService();
