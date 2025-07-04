import {
  users,
  artworks,
  bids,
  // watchlist, // Disabled until table is created
  type User,
  type UpsertUser,
  type Artwork,
  type ArtworkWithArtist,
  type InsertArtwork,
  type Bid,
  type BidWithBidder,
  type InsertBid,
  // type Watchlist, // Disabled until table is created
  // type InsertWatchlist, // Disabled until table is created
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gt, or, like, count, sql, lt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { formatDecimal } from "./utils";

// Helper function to format artwork price fields
function formatArtworkPrices(artwork: any): any {
  return {
    ...artwork,
    startingPrice: formatDecimal(artwork.startingPrice),
    currentPrice: formatDecimal(artwork.currentPrice),
  };
}

// Helper function to format bid amounts
function formatBidAmount(bid: any): any {
  return {
    ...bid,
    amount: formatDecimal(bid.amount),
  };
}

// Helper function to format bid amounts in BidWithBidder
function formatBidWithBidder(bid: any): any {
  return {
    ...bid,
    amount: formatDecimal(bid.amount),
  };
}

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(userId: string, role: string): Promise<void>;
  getAllUsers(): Promise<User[]>;
  deleteUserAccount(userId: string, forceDelete?: boolean): Promise<void>;
  
  // Artwork operations
  createArtwork(artwork: InsertArtwork): Promise<Artwork>;
  getArtwork(id: string): Promise<ArtworkWithArtist | undefined>;
  getArtworks(filters?: { category?: string; search?: string }): Promise<ArtworkWithArtist[]>;
  getUserArtworks(userId: string): Promise<ArtworkWithArtist[]>;
  getAllArtworks(): Promise<ArtworkWithArtist[]>;
  updateArtworkPrice(id: string, currentPrice: string): Promise<void>;
  deleteArtwork(id: string): Promise<void>;
  updateArtworkStatus(id: string, status: "PENDING" | "ACTIVE" | "SOLD" | "EXPIRED"): Promise<void>;
  processExpiredArtworks(): Promise<void>;
  
  // Bid operations
  createBid(bid: InsertBid): Promise<Bid>;
  getArtworkBids(artworkId: string): Promise<BidWithBidder[]>;
  getUserBids(userId: string): Promise<Bid[]>;
  getAllBids(): Promise<BidWithBidder[]>;
  
  // Watchlist operations (disabled until table is created)
  // addToWatchlist(watchlist: InsertWatchlist): Promise<Watchlist>;
  // removeFromWatchlist(userId: string, artworkId: string): Promise<void>;
  // getUserWatchlist(userId: string): Promise<Watchlist[]>;
  
  // Statistics
  getStats(): Promise<{
    totalArtworks: number;
    totalArtists: number;
    totalSales: string;
    totalCollectors: number;
  }>;
  
  // Admin statistics
  getAdminStats(): Promise<{
    totalUsers: number;
    totalArtworks: number;
    totalBids: number;
    totalRevenue: string;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserRole(userId: string, role: string): Promise<void> {
    await db
      .update(users)
      .set({ role: role as "BIDDER" | "ARTIST" | "ADMIN", updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async getAllUsers(): Promise<User[]> {
    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
    return allUsers;
  }

  async deleteUserAccount(userId: string, forceDelete: boolean = false): Promise<void> {
    console.log(`🗑️ Starting account deletion for user ${userId} (force: ${forceDelete})`);
    
    try {
      // Start a transaction-like process to delete all user data
      
      // 1. Delete all user's bids
      console.log(`🎯 Deleting user's bids...`);
      await db.delete(bids).where(eq(bids.bidderId, userId));
      
      // 2. Delete all user's artworks (and their associated bids)
      console.log(`🎨 Deleting user's artworks...`);
      const userArtworks = await db.select({ id: artworks.id }).from(artworks).where(eq(artworks.artistId, userId));
      
      for (const artwork of userArtworks) {
        // Delete all bids on this artwork
        await db.delete(bids).where(eq(bids.artworkId, artwork.id));
        // Delete the artwork itself
        await db.delete(artworks).where(eq(artworks.id, artwork.id));
      }
      
      // 3. Delete the user record
      console.log(`👤 Deleting user record...`);
      await db.delete(users).where(eq(users.id, userId));
      
      console.log(`✅ Successfully deleted all data for user ${userId}`);
    } catch (error) {
      console.error(`❌ Error during account deletion for user ${userId}:`, error);
      throw error;
    }
  }

  // Artwork operations
  async createArtwork(artworkData: InsertArtwork): Promise<Artwork> {
    const [artwork] = await db
      .insert(artworks)
      .values({
        ...artworkData,
        id: nanoid(),
        currentPrice: artworkData.startingPrice,
        // Set default timestamps
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return formatArtworkPrices(artwork);
  }

  async getArtwork(id: string): Promise<ArtworkWithArtist | undefined> {
    const [artwork] = await db
      .select({
        id: artworks.id,
        title: artworks.title,
        description: artworks.description,
        imageUrl: artworks.imageUrl,
        imagePublicId: artworks.imagePublicId,
        category: artworks.category,
        startingPrice: artworks.startingPrice,
        currentPrice: artworks.currentPrice,
        status: artworks.status,
        auctionStart: artworks.auctionStart,
        endTime: artworks.endTime,
        isActive: artworks.isActive,
        artistId: artworks.artistId,
        createdAt: artworks.createdAt,
        updatedAt: artworks.updatedAt,
        artist: {
          id: users.id,
          firstName: users.name,
          lastName: sql<string | null>`NULL`, // Don't duplicate the name
          email: users.email,
        },
      })
      .from(artworks)
      .leftJoin(users, eq(artworks.artistId, users.id))
      .where(eq(artworks.id, id));
    
    return artwork ? formatArtworkPrices(artwork) as ArtworkWithArtist : undefined;
  }

  async getArtworks(filters?: { category?: string; search?: string }): Promise<ArtworkWithArtist[]> {
    let whereConditions = [eq(artworks.isActive, true)];
    
    if (filters?.category) {
      whereConditions.push(eq(artworks.category, filters.category));
    }
    
    if (filters?.search) {
      const searchCondition = or(
        like(artworks.title, `%${filters.search}%`),
        like(artworks.description, `%${filters.search}%`)
      );
      if (searchCondition) {
        whereConditions.push(searchCondition);
      }
    }
    
    const artworksList = await db
      .select({
        id: artworks.id,
        title: artworks.title,
        description: artworks.description,
        imageUrl: artworks.imageUrl,
        imagePublicId: artworks.imagePublicId,
        category: artworks.category,
        startingPrice: artworks.startingPrice,
        currentPrice: artworks.currentPrice,
        status: artworks.status,
        auctionStart: artworks.auctionStart,
        endTime: artworks.endTime,
        isActive: artworks.isActive,
        artistId: artworks.artistId,
        createdAt: artworks.createdAt,
        updatedAt: artworks.updatedAt,
        artist: {
          id: users.id,
          firstName: users.name,
          lastName: sql<string | null>`NULL`, // Don't duplicate the name
          email: users.email,
        },
      })
      .from(artworks)
      .leftJoin(users, eq(artworks.artistId, users.id))
      .where(whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0])
      .orderBy(desc(artworks.createdAt));
    
    return artworksList.map(formatArtworkPrices) as ArtworkWithArtist[];
  }

  async getUserArtworks(userId: string): Promise<ArtworkWithArtist[]> {
    const userArtworks = await db
      .select({
        id: artworks.id,
        title: artworks.title,
        description: artworks.description,
        imageUrl: artworks.imageUrl,
        imagePublicId: artworks.imagePublicId,
        category: artworks.category,
        startingPrice: artworks.startingPrice,
        currentPrice: artworks.currentPrice,
        status: artworks.status,
        auctionStart: artworks.auctionStart,
        endTime: artworks.endTime,
        isActive: artworks.isActive,
        artistId: artworks.artistId,
        createdAt: artworks.createdAt,
        updatedAt: artworks.updatedAt,
        artist: {
          id: users.id,
          firstName: users.name,
          lastName: sql<string | null>`NULL`, // Don't duplicate the name
          email: users.email,
        },
      })
      .from(artworks)
      .leftJoin(users, eq(artworks.artistId, users.id))
      .where(eq(artworks.artistId, userId))
      .orderBy(desc(artworks.createdAt));
    
    return userArtworks.map(formatArtworkPrices) as ArtworkWithArtist[];
  }

  async updateArtworkPrice(id: string, currentPrice: string): Promise<void> {
    await db
      .update(artworks)
      .set({ currentPrice, updatedAt: new Date() })
      .where(eq(artworks.id, id));
  }

  async deleteArtwork(id: string): Promise<void> {
    console.log(`🗑️ Starting deleteArtwork process for ID: ${id}`);
    
    // First delete the artwork from Cloudinary if it has an imagePublicId
    try {
      const artwork = await this.getArtwork(id);
      if (artwork?.imagePublicId) {
        console.log(`☁️ Deleting image from Cloudinary: ${artwork.imagePublicId}`);
        const { deleteFromCloudinary } = await import("./cloudinary");
        await deleteFromCloudinary(artwork.imagePublicId);
        console.log(`✅ Cloudinary image deleted: ${artwork.imagePublicId}`);
      } else {
        console.log(`ℹ️ No Cloudinary image to delete for artwork ${id}`);
      }
    } catch (error) {
      console.error("❌ Error deleting image from Cloudinary:", error);
      // Continue with database deletion even if Cloudinary deletion fails
    }
    
    // Delete from database
    console.log(`💾 Deleting artwork from database: ${id}`);
    const result = await db.delete(artworks).where(eq(artworks.id, id));
    console.log(`✅ Database deletion completed for artwork ${id}:`, result);
  }

  async updateArtworkStatus(id: string, status: "PENDING" | "ACTIVE" | "SOLD" | "EXPIRED"): Promise<void> {
    await db
      .update(artworks)
      .set({ status, updatedAt: new Date() })
      .where(eq(artworks.id, id));
  }

  async processExpiredArtworks(): Promise<void> {
    const now = new Date();
    
    // Get all active artworks that have expired
    const expiredArtworks = await db
      .select({
        id: artworks.id,
        title: artworks.title,
        artistId: artworks.artistId,
        currentPrice: artworks.currentPrice,
        startingPrice: artworks.startingPrice,
      })
      .from(artworks)
      .where(
        and(
          eq(artworks.status, "ACTIVE"),
          lt(artworks.endTime, now)
        )
      );

    for (const artwork of expiredArtworks) {
      // Check if artwork has any bids
      const bids = await this.getArtworkBids(artwork.id);
      
      if (bids.length > 0) {
        // Has bids - mark as SOLD
        await this.updateArtworkStatus(artwork.id, "SOLD");
        console.log(`Artwork ${artwork.title} (${artwork.id}) marked as SOLD with winning bid`);
      } else {
        // No bids - mark as EXPIRED
        await this.updateArtworkStatus(artwork.id, "EXPIRED");
        console.log(`Artwork ${artwork.title} (${artwork.id}) marked as EXPIRED with no bids`);
      }
    }
    
    if (expiredArtworks.length > 0) {
      console.log(`Processed ${expiredArtworks.length} expired artworks`);
    }
  }

  // Bid operations
  async createBid(bidData: InsertBid): Promise<Bid> {
    const [bid] = await db
      .insert(bids)
      .values({
        ...bidData,
        id: nanoid(),
      })
      .returning();
    
    // Update artwork current price
    await this.updateArtworkPrice(bidData.artworkId, bidData.amount);
    
    return formatBidAmount(bid);
  }

  async getArtworkBids(artworkId: string): Promise<BidWithBidder[]> {
    const bidsData = await db
      .select({
        id: bids.id,
        artworkId: bids.artworkId,
        bidderId: bids.bidderId,
        amount: bids.amount,
        createdAt: bids.createdAt,
        bidder: {
          id: users.id,
          firstName: users.name,
          lastName: sql<string | null>`NULL`, // Don't duplicate the name
          email: users.email,
        },
      })
      .from(bids)
      .leftJoin(users, eq(bids.bidderId, users.id))
      .where(eq(bids.artworkId, artworkId))
      .orderBy(desc(bids.createdAt));
      
    return bidsData.map(formatBidWithBidder);
  }

  async getUserBids(userId: string): Promise<Bid[]> {
    const userBids = await db
      .select()
      .from(bids)
      .where(eq(bids.bidderId, userId))
      .orderBy(desc(bids.createdAt));
      
    return userBids.map(formatBidAmount);
  }

  async getAllBids(): Promise<BidWithBidder[]> {
    const allBids = await db
      .select({
        id: bids.id,
        artworkId: bids.artworkId,
        bidderId: bids.bidderId,
        amount: bids.amount,
        createdAt: bids.createdAt,
        bidder: {
          id: users.id,
          firstName: users.name,
          lastName: sql<string | null>`NULL`,
          email: users.email,
        },
      })
      .from(bids)
      .leftJoin(users, eq(bids.bidderId, users.id))
      .orderBy(desc(bids.createdAt));
    
    return allBids.map(formatBidWithBidder);
  }

  // Watchlist operations (disabled until table is created)
  /*
  async addToWatchlist(watchlistData: InsertWatchlist): Promise<Watchlist> {
    const [watchlistItem] = await db
      .insert(watchlist)
      .values({
        ...watchlistData,
        id: nanoid(),
      })
      .returning();
    return watchlistItem;
  }

  async removeFromWatchlist(userId: string, artworkId: string): Promise<void> {
    await db
      .delete(watchlist)
      .where(
        and(
          eq(watchlist.userId, userId),
          eq(watchlist.artworkId, artworkId)
        )
      );
  }

  async getUserWatchlist(userId: string): Promise<Watchlist[]> {
    return await db
      .select()
      .from(watchlist)
      .where(eq(watchlist.userId, userId))
      .orderBy(desc(watchlist.createdAt));
  }
  */

  // Statistics
  async getStats(): Promise<{
    totalArtworks: number;
    totalArtists: number;
    totalSales: string;
    totalCollectors: number;
  }> {
    const [artworkCount] = await db
      .select({ count: count() })
      .from(artworks);
    
    const [artistCount] = await db
      .select({ count: count() })
      .from(users);
    
    const [bidCount] = await db
      .select({ count: count() })
      .from(bids);
    
    return {
      totalArtworks: Number(artworkCount?.count) || 0,
      totalArtists: Number(artistCount?.count) || 0,
      totalSales: "0.00", // This would need more complex calculation
      totalCollectors: Number(bidCount?.count) || 0,
    };
  }

  async getAdminStats(): Promise<{
    totalUsers: number;
    totalArtworks: number;
    totalBids: number;
    totalRevenue: string;
  }> {
    const [userCount] = await db
      .select({ count: count() })
      .from(users);
    
    const [artworkCount] = await db
      .select({ count: count() })
      .from(artworks);
    
    const [bidCount] = await db
      .select({ count: count() })
      .from(bids);
    
    // Total revenue calculation: sum of all bid amounts (approximation)
    const [totalRevenueData] = await db
      .select({ totalRevenue: sql<string>`SUM(amount)` })
      .from(bids);
    
    return {
      totalUsers: Number(userCount?.count) || 0,
      totalArtworks: Number(artworkCount?.count) || 0,
      totalBids: Number(bidCount?.count) || 0,
      totalRevenue: totalRevenueData?.totalRevenue || "0.00",
    };
  }

  async getAllArtworks(): Promise<ArtworkWithArtist[]> {
    const allArtworks = await db
      .select({
        id: artworks.id,
        title: artworks.title,
        description: artworks.description,
        imageUrl: artworks.imageUrl,
        imagePublicId: artworks.imagePublicId,
        category: artworks.category,
        startingPrice: artworks.startingPrice,
        currentPrice: artworks.currentPrice,
        status: artworks.status,
        auctionStart: artworks.auctionStart,
        endTime: artworks.endTime,
        isActive: artworks.isActive,
        artistId: artworks.artistId,
        createdAt: artworks.createdAt,
        updatedAt: artworks.updatedAt,
        artist: {
          id: users.id,
          firstName: users.name,
          lastName: sql<string | null>`NULL`,
          email: users.email,
        },
      })
      .from(artworks)
      .leftJoin(users, eq(artworks.artistId, users.id))
      .orderBy(desc(artworks.createdAt));
    
    return allArtworks.map(formatArtworkPrices);
  }
}

export const storage = new DatabaseStorage();
