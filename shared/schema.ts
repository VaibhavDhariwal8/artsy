import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  decimal,
  boolean,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const artworkStatusEnum = pgEnum("ArtworkStatus", ["PENDING", "ACTIVE", "SOLD", "EXPIRED"]);
export const userRoleEnum = pgEnum("UserRole", ["BIDDER", "ARTIST", "ADMIN"]);

// User storage table for Clerk users
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(), // Clerk user ID
  clerkId: varchar("clerkId").notNull(), // Clerk user ID (duplicate for compatibility)
  email: varchar("email").notNull(),
  name: varchar("name"),
  role: userRoleEnum("role").notNull().default("BIDDER"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const artworks = pgTable("artworks", {
  id: varchar("id").primaryKey().notNull(),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("imageUrl").notNull(), // This matches database column
  imagePublicId: text("imagePublicId").notNull(), // This matches database column
  category: varchar("category"),
  startingPrice: decimal("startingBid", { precision: 10, scale: 2 }).notNull(), // This matches database column
  currentPrice: decimal("currentBid", { precision: 10, scale: 2 }).notNull(), // This matches database column
  status: artworkStatusEnum("status").notNull().default("ACTIVE"), // This matches database column
  auctionStart: timestamp("auctionStart"), // This matches database column
  endTime: timestamp("auctionEnd").notNull(), // This matches database column
  isActive: boolean("is_active").default(true),
  artistId: text("artistId").notNull(), // This matches database column
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const bids = pgTable("bids", {
  id: varchar("id").primaryKey().notNull(),
  artworkId: varchar("artworkId").notNull(),
  bidderId: varchar("bidderId").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
});

// Watchlist table (not created yet)
// export const watchlist = pgTable("watchlist", {
//   id: varchar("id").primaryKey().notNull(),
//   userId: varchar("user_id").notNull(),
//   artworkId: varchar("artwork_id").notNull(),
//   createdAt: timestamp("created_at").defaultNow(),
// });

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  artworks: many(artworks),
  bids: many(bids),
  // watchlist: many(watchlist), // Disabled until table is created
}));

export const artworksRelations = relations(artworks, ({ one, many }) => ({
  artist: one(users, { fields: [artworks.artistId], references: [users.id] }),
  bids: many(bids),
  // watchlist: many(watchlist), // Disabled until table is created
}));

export const bidsRelations = relations(bids, ({ one }) => ({
  artwork: one(artworks, { fields: [bids.artworkId], references: [artworks.id] }),
  bidder: one(users, { fields: [bids.bidderId], references: [users.id] }),
}));

// Watchlist relations disabled until table is created
// export const watchlistRelations = relations(watchlist, ({ one }) => ({
//   user: one(users, { fields: [watchlist.userId], references: [users.id] }),
//   artwork: one(artworks, { fields: [watchlist.artworkId], references: [artworks.id] }),
// }));

// Schemas
export const insertArtworkSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  imageUrl: z.string().min(1, "Image URL is required"),
  imagePublicId: z.string().min(1, "Image Public ID is required"),
  category: z.string().min(1, "Category is required"),
  startingPrice: z.string().transform((str) => str), // Keep as string for decimal handling
  endTime: z.string().transform((str) => new Date(str)),
  artistId: z.string().min(1, "Artist ID is required"),
  status: z.enum(["PENDING", "ACTIVE", "SOLD", "EXPIRED"]).default("ACTIVE"),
});

export const insertBidSchema = createInsertSchema(bids).omit({
  id: true,
  createdAt: true,
});

// Watchlist schema disabled until table is created
// export const insertWatchlistSchema = createInsertSchema(watchlist).omit({
//   id: true,
//   createdAt: true,
// });

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Artwork = typeof artworks.$inferSelect;
export type InsertArtwork = z.infer<typeof insertArtworkSchema>;
export type Bid = typeof bids.$inferSelect;
export type InsertBid = z.infer<typeof insertBidSchema>;
// export type Watchlist = typeof watchlist.$inferSelect; // Disabled until table is created
// export type InsertWatchlist = z.infer<typeof insertWatchlistSchema>; // Disabled until table is created

// Extended types with relationships
export type ArtworkWithArtist = Artwork & {
  artist: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
};

export type BidWithBidder = Bid & {
  bidder: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
};
