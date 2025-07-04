import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./clerkAuth";
import { storage } from "./storage";

export type UserRole = "BIDDER" | "ARTIST" | "ADMIN";

// Middleware to check user role
export function requireRole(requiredRole: UserRole) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const userRole = user.role as UserRole;
      
      // Check if user has required role
      if (requiredRole === "ADMIN" && userRole !== "ADMIN") {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      if (requiredRole === "ARTIST" && userRole !== "ARTIST" && userRole !== "ADMIN") {
        return res.status(403).json({ message: "Artist access required" });
      }

      // Add user role to request for use in subsequent middleware
      req.userRole = userRole;
      next();
    } catch (error) {
      console.error("❌ Error checking user role:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
}

// Middleware to check if user can modify artwork
export function requireArtworkOwnership() {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const artworkId = req.params.id;
      
      if (!userId || !artworkId) {
        return res.status(400).json({ message: "Invalid request" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const userRole = user.role as UserRole;
      
      // Admin can modify any artwork
      if (userRole === "ADMIN") {
        next();
        return;
      }

      // Artists can only modify their own artworks
      const artwork = await storage.getArtwork(artworkId);
      if (!artwork) {
        return res.status(404).json({ message: "Artwork not found" });
      }

      if (artwork.artistId !== userId) {
        return res.status(403).json({ message: "You can only modify your own artworks" });
      }

      next();
    } catch (error) {
      console.error("Error checking artwork ownership:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
}

// Helper function to check if user has permission
export function hasPermission(userRole: UserRole, permission: string): boolean {
  const permissions = {
    BIDDER: ["bid", "view"],
    ARTIST: ["bid", "view", "upload", "edit_own", "delete_own"],
    ADMIN: ["bid", "view", "upload", "edit_own", "delete_own", "edit_any", "delete_any", "manage_users", "view_analytics"],
  };
  
  return permissions[userRole]?.includes(permission) || false;
}
