import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import path from "path";
import { storage } from "./storage";
import { authenticateClerk, requireAuth, type AuthenticatedRequest } from "./clerkAuth";
import { requireRole, requireArtworkOwnership } from "./roleMiddleware";
import { insertArtworkSchema, insertBidSchema } from "@shared/schema";
import { nanoid } from "nanoid";
import { upload, cleanupTempFile } from "./fileUpload";
import { uploadToCloudinary } from "./cloudinary";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  app.use('/api', authenticateClerk);
  
  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.status(200).json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });
  
  // Serve uploaded files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Auth routes
  app.get('/api/auth/user', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const user = await storage.getUser(userId);
      res.json(user || req.user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User role routes
  app.get('/api/user/role', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      let user = await storage.getUser(userId);
      
      // If user doesn't exist, create them with default role
      if (!user) {
        const userName = req.user!.firstName && req.user!.lastName 
          ? `${req.user!.firstName} ${req.user!.lastName}`
          : req.user!.username || "Anonymous User";
        
        user = await storage.upsertUser({
          id: userId,
          clerkId: userId,
          name: userName,
          email: req.user!.email,
          role: "BIDDER"
        });
      }
      
      res.json(user.role);
    } catch (error) {
      console.error("Error fetching user role:", error);
      res.status(500).json({ message: "Failed to fetch user role" });
    }
  });

  app.put('/api/user/role', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { role } = req.body;
      
      if (!["BIDDER", "ARTIST", "ADMIN"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      await storage.updateUserRole(userId, role);
      res.json({ message: "Role updated successfully" });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Artwork routes
  app.get('/api/artworks', async (req, res) => {
    try {
      const { category, search } = req.query;
      const artworks = await storage.getArtworks({
        category: category as string,
        search: search as string,
      });
      res.json(artworks);
    } catch (error) {
      console.error("Error fetching artworks:", error);
      res.status(500).json({ message: "Failed to fetch artworks" });
    }
  });

  app.get('/api/artworks/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const artwork = await storage.getArtwork(id);
      if (!artwork) {
        return res.status(404).json({ message: "Artwork not found" });
      }
      res.json(artwork);
    } catch (error) {
      console.error("Error fetching artwork:", error);
      res.status(500).json({ message: "Failed to fetch artwork" });
    }
  });

  app.post('/api/artworks', requireAuth, requireRole('ARTIST'), upload.single('image'), async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      console.log(`🎨 User ${userId} starting artwork upload...`);
      
      if (!req.file) {
        return res.status(400).json({ message: "Image file is required" });
      }

      console.log(`📁 Temporary file saved: ${req.file.path}`);
      console.log(`📋 Form data received:`, {
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        startingPrice: req.body.startingPrice,
        endTime: req.body.endTime
      });

      // Upload to Cloudinary (this will also cleanup the temp file)
      let cloudinaryResult;
      try {
        cloudinaryResult = await uploadToCloudinary(req.file.path, req.file.filename);
        console.log(`☁️ Successfully uploaded to Cloudinary: ${cloudinaryResult.secure_url}`);
      } catch (cloudinaryError) {
        console.error('❌ Cloudinary upload failed:', cloudinaryError);
        // Cleanup temp file on failure
        cleanupTempFile(req.file.path);
        return res.status(500).json({ message: "Failed to upload image to cloud storage" });
      }

      // Parse form data - all values come as strings from FormData
      const formData = {
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        startingPrice: req.body.startingPrice,
        endTime: req.body.endTime, // This will be transformed to Date by the schema
        artistId: userId,
        imageUrl: cloudinaryResult.secure_url,
        imagePublicId: cloudinaryResult.public_id,
        status: 'ACTIVE' as const, // Set enum value
      };
      
      console.log(`🔍 Validating data with schema...`);
      const validatedData = insertArtworkSchema.parse(formData);
      console.log(`✅ Schema validation passed:`, validatedData);
      
      console.log(`💾 Saving artwork to database...`);
      const artwork = await storage.createArtwork(validatedData);
      console.log(`✅ Artwork saved to database:`, artwork);
      
      // Add cloudinary metadata to response
      const artworkWithCloudinary = {
        ...artwork,
        cloudinaryPublicId: cloudinaryResult.public_id,
        imageMetadata: {
          width: cloudinaryResult.width,
          height: cloudinaryResult.height,
          format: cloudinaryResult.format,
          bytes: cloudinaryResult.bytes
        }
      };

      console.log(`🎉 Upload completed successfully for artwork: ${artwork.id}`);
      res.status(201).json(artworkWithCloudinary);
    } catch (error) {
      console.error("❌ Error creating artwork:", error);
      console.error("❌ Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      
      // Cleanup temp file if it exists
      if (req.file) {
        cleanupTempFile(req.file.path);
      }
      
      if (error instanceof Error && error.name === 'ZodError') {
        console.error("❌ Zod validation error details:", error.message);
        return res.status(400).json({ message: "Invalid data", details: error.message });
      }
      res.status(500).json({ message: "Failed to create artwork" });
    }
  });

  app.get('/api/user/artworks', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const artworks = await storage.getUserArtworks(userId);
      res.json(artworks);
    } catch (error) {
      console.error("Error fetching user artworks:", error);
      res.status(500).json({ message: "Failed to fetch user artworks" });
    }
  });

  // Delete artwork route (only for the artist who owns it, and only if no bids exist)
  app.delete('/api/artworks/:id', requireAuth, requireArtworkOwnership(), async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      
      console.log(`🗑️ User ${userId} attempting to delete artwork ${id}`);
      
      // Check if artwork exists and belongs to the user
      const artwork = await storage.getArtwork(id);
      if (!artwork) {
        console.log(`❌ Artwork ${id} not found`);
        return res.status(404).json({ message: "Artwork not found" });
      }
      
      console.log(`🎨 Found artwork: ${artwork.title} by ${artwork.artistId}`);
      
      if (artwork.artistId !== userId) {
        console.log(`❌ Permission denied: artwork belongs to ${artwork.artistId}, not ${userId}`);
        return res.status(403).json({ message: "You can only delete your own artworks" });
      }
      
      // Check if artwork has ended
      const now = new Date();
      const endTime = new Date(artwork.endTime);
      console.log(`⏰ Current time: ${now.toISOString()}, End time: ${endTime.toISOString()}`);
      if (now >= endTime) {
        console.log(`❌ Cannot delete: auction has ended`);
        return res.status(400).json({ message: "Cannot delete artwork after auction has ended" });
      }
      
      // Check if there are any bids
      const bids = await storage.getArtworkBids(id);
      console.log(`🎯 Found ${bids.length} bids for artwork ${id}`);
      if (bids.length > 0) {
        console.log(`❌ Cannot delete: artwork has ${bids.length} bids`);
        return res.status(400).json({ message: "Cannot delete artwork with existing bids" });
      }
      
      // Delete the artwork
      console.log(`🗑️ Proceeding to delete artwork ${id}`);
      await storage.deleteArtwork(id);
      console.log(`✅ Successfully deleted artwork ${id}`);
      
      res.status(204).send();
    } catch (error) {
      console.error("❌ Error deleting artwork:", error);
      res.status(500).json({ message: "Failed to delete artwork" });
    }
  });

  // Manual trigger for processing expired artworks (admin/debug route)
  app.post('/api/admin/process-expired-artworks', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      await storage.processExpiredArtworks();
      res.json({ message: "Expired artworks processed successfully" });
    } catch (error) {
      console.error("Error processing expired artworks:", error);
      res.status(500).json({ message: "Failed to process expired artworks" });
    }
  });

  // Bid routes
  app.get('/api/artworks/:id/bids', async (req, res) => {
    try {
      const { id } = req.params;
      const bids = await storage.getArtworkBids(id);
      res.json(bids);
    } catch (error) {
      console.error("Error fetching bids:", error);
      res.status(500).json({ message: "Failed to fetch bids" });
    }
  });

  app.post('/api/bids', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const validatedData = insertBidSchema.parse({
        ...req.body,
        bidderId: userId,
      });
      
      const bid = await storage.createBid(validatedData);
      
      // Notify WebSocket clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'NEW_BID',
            artworkId: validatedData.artworkId,
            bid: bid,
          }));
        }
      });
      
      res.status(201).json(bid);
    } catch (error) {
      console.error("Error creating bid:", error);
      res.status(500).json({ message: "Failed to create bid" });
    }
  });

  app.get('/api/user/bids', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const bids = await storage.getUserBids(userId);
      res.json(bids);
    } catch (error) {
      console.error("Error fetching user bids:", error);
      res.status(500).json({ message: "Failed to fetch user bids" });
    }
  });

  // Watchlist routes - DISABLED (table not created)
  /*
  app.get('/api/user/watchlist', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const watchlist = await storage.getUserWatchlist(userId);
      res.json(watchlist);
    } catch (error) {
      console.error("Error fetching watchlist:", error);
      res.status(500).json({ message: "Failed to fetch watchlist" });
    }
  });

  app.post('/api/watchlist', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const validatedData = insertWatchlistSchema.parse({
        ...req.body,
        userId,
      });
      
      const watchlistItem = await storage.addToWatchlist(validatedData);
      res.status(201).json(watchlistItem);
    } catch (error) {
      console.error("Error adding to watchlist:", error);
      res.status(500).json({ message: "Failed to add to watchlist" });
    }
  });

  app.delete('/api/watchlist/:artworkId', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { artworkId } = req.params;
      
      await storage.removeFromWatchlist(userId, artworkId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing from watchlist:", error);
      res.status(500).json({ message: "Failed to remove from watchlist" });
    }
  });
  */

  // Statistics route
  app.get('/api/stats', async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Admin routes
  app.get('/api/admin/stats', requireAuth, requireRole('ADMIN'), async (req: AuthenticatedRequest, res) => {
    try {
      console.log(`📊 Admin ${req.user!.id} requesting stats`);
      const stats = await storage.getAdminStats();
      console.log(`📊 Admin stats retrieved:`, stats);
      res.json(stats);
    } catch (error) {
      console.error("❌ Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  app.get('/api/admin/users', requireAuth, requireRole('ADMIN'), async (req: AuthenticatedRequest, res) => {
    try {
      console.log(`👥 Admin ${req.user!.id} requesting users`);
      const users = await storage.getAllUsers();
      console.log(`👥 Found ${users.length} users`);
      res.json(users);
    } catch (error) {
      console.error("❌ Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/admin/artworks', requireAuth, requireRole('ADMIN'), async (req: AuthenticatedRequest, res) => {
    try {
      console.log(`🎨 Admin ${req.user!.id} requesting artworks`);
      const artworks = await storage.getAllArtworks();
      console.log(`🎨 Found ${artworks.length} artworks`);
      res.json(artworks);
    } catch (error) {
      console.error("❌ Error fetching artworks:", error);
      res.status(500).json({ message: "Failed to fetch artworks" });
    }
  });

  app.get('/api/admin/bids', requireAuth, requireRole('ADMIN'), async (req: AuthenticatedRequest, res) => {
    try {
      console.log(`🎯 Admin ${req.user!.id} requesting bids`);
      const bids = await storage.getAllBids();
      console.log(`🎯 Found ${bids.length} bids`);
      res.json(bids);
    } catch (error) {
      console.error("❌ Error fetching bids:", error);
      res.status(500).json({ message: "Failed to fetch bids" });
    }
  });

  app.put('/api/admin/users/:userId/role', requireAuth, requireRole('ADMIN'), async (req: AuthenticatedRequest, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      
      if (!["BIDDER", "ARTIST", "ADMIN"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      await storage.updateUserRole(userId, role);
      res.json({ message: "User role updated successfully" });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.delete('/api/admin/artworks/:id', requireAuth, requireRole('ADMIN'), async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      console.log(`🗑️ Admin ${req.user!.id} deleting artwork ${id}`);
      
      const artwork = await storage.getArtwork(id);
      if (!artwork) {
        return res.status(404).json({ message: "Artwork not found" });
      }

      await storage.deleteArtwork(id);
      console.log(`✅ Admin successfully deleted artwork ${id}`);
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting artwork:", error);
      res.status(500).json({ message: "Failed to delete artwork" });
    }
  });

  // Temporary endpoint to fix user roles (remove after fixing)
  app.post('/api/admin/fix-user-roles', requireAuth, requireRole('ADMIN'), async (req: AuthenticatedRequest, res) => {
    try {
      console.log(`🔧 Admin ${req.user!.id} fixing user roles...`);
      
      const allUsers = await storage.getAllUsers();
      console.log(`👥 Found ${allUsers.length} users to check`);
      
      let fixedCount = 0;
      for (const user of allUsers) {
        // Set all users to BIDDER as default unless they're already ADMIN
        if (user.role !== 'ADMIN') {
          await storage.updateUserRole(user.id, 'BIDDER');
          console.log(`✅ Updated user ${user.id} (${user.name || user.email}) to BIDDER`);
          fixedCount++;
        }
      }
      
      console.log(`🎉 Fixed ${fixedCount} user roles`);
      res.json({ 
        message: `Successfully fixed ${fixedCount} user roles`,
        totalUsers: allUsers.length,
        fixedUsers: fixedCount
      });
    } catch (error) {
      console.error("❌ Error fixing user roles:", error);
      res.status(500).json({ message: "Failed to fix user roles" });
    }
  });

  // Account deletion routes
  app.delete('/api/user/account', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      console.log(`🗑️ User ${userId} attempting to delete their account`);
      
      // Check if user has active artworks with bids
      const userArtworks = await storage.getUserArtworks(userId);
      const activeArtworksWithBids = [];
      
      for (const artwork of userArtworks) {
        const bids = await storage.getArtworkBids(artwork.id);
        const now = new Date();
        const endTime = new Date(artwork.endTime);
        
        if (bids.length > 0 && now < endTime) {
          activeArtworksWithBids.push({
            id: artwork.id,
            title: artwork.title,
            bidsCount: bids.length
          });
        }
      }
      
      if (activeArtworksWithBids.length > 0) {
        console.log(`❌ Cannot delete account: user has ${activeArtworksWithBids.length} active artworks with bids`);
        return res.status(400).json({ 
          message: "Cannot delete account while you have active artworks with bids. Please wait for auctions to end or contact support.",
          activeArtworks: activeArtworksWithBids
        });
      }
      
      // Delete user account and all associated data
      await storage.deleteUserAccount(userId);
      console.log(`✅ Successfully deleted account for user ${userId}`);
      
      res.status(204).send();
    } catch (error) {
      console.error("❌ Error deleting user account:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  // Admin route to delete any user account
  app.delete('/api/admin/users/:userId', requireAuth, requireRole('ADMIN'), async (req: AuthenticatedRequest, res) => {
    try {
      const { userId } = req.params;
      const adminId = req.user!.id;
      console.log(`🗑️ Admin ${adminId} attempting to delete user account ${userId}`);
      
      // Prevent admin from deleting their own account through this route
      if (adminId === userId) {
        return res.status(400).json({ message: "Admins cannot delete their own accounts through this endpoint. Use the regular account deletion." });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Force delete user account and all associated data (admin override)
      await storage.deleteUserAccount(userId, true);
      console.log(`✅ Admin ${adminId} successfully deleted user account ${userId}`);
      
      res.status(204).send();
    } catch (error) {
      console.error("❌ Error deleting user account:", error);
      res.status(500).json({ message: "Failed to delete user account" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log('New WebSocket connection');
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        // Handle different message types if needed
        console.log('Received:', data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });
  });

  return httpServer;
}
