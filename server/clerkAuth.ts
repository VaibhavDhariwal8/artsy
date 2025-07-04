import { clerkMiddleware, requireAuth as clerkRequireAuth } from "@clerk/express";
import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

export interface AuthenticatedRequest extends Request {
  auth?: () => {
    userId: string;
    user?: {
      id: string;
      emailAddresses: Array<{ emailAddress: string }>;
      firstName: string;
      lastName: string;
      username: string;
    };
  } | null;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    username: string;
  };
  userRole?: "BIDDER" | "ARTIST" | "ADMIN";
}

export const authenticateClerk = clerkMiddleware({
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  secretKey: process.env.CLERK_SECRET_KEY,
});

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const auth = req.auth?.();
  if (!auth?.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  try {
    // Fetch user data from Clerk API
    let userInfo = {
      id: auth.userId,
      email: "",
      firstName: "",
      lastName: "",
      username: "",
    };
    
    // Try to get user data from Clerk API
    if (process.env.CLERK_SECRET_KEY) {
      try {
        const clerkUser = await fetch(`https://api.clerk.com/v1/users/${auth.userId}`, {
          headers: {
            Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
          },
        });
        
        if (clerkUser.ok) {
          const userData = await clerkUser.json();
          userInfo = {
            id: auth.userId,
            email: userData.email_addresses?.[0]?.email_address || "",
            firstName: userData.first_name || "",
            lastName: userData.last_name || "",
            username: userData.username || "",
          };
          console.log(`👤 Fetched user data from Clerk: ${userInfo.firstName} ${userInfo.lastName} (${userInfo.email})`);
        }
      } catch (error) {
        console.error("❌ Error fetching user from Clerk API:", error);
      }
    }
    
    // Ensure user exists in our database
    const dbUser = await storage.getUser(auth.userId);
    if (!dbUser) {
      console.log(`📝 Creating new user record for: ${auth.userId}`);
      await storage.upsertUser({
        id: auth.userId,
        clerkId: auth.userId,
        email: userInfo.email,
        name: `${userInfo.firstName} ${userInfo.lastName}`.trim() || userInfo.username || userInfo.email,
        role: 'BIDDER' as const, // Default role for new users
      });
      console.log(`✅ User record created for: ${auth.userId}`);
    } else {
      // Update user info if we have new data
      const newName = `${userInfo.firstName} ${userInfo.lastName}`.trim() || userInfo.username || userInfo.email;
      if (newName && newName !== dbUser.name) {
        console.log(`📝 Updating user record for: ${auth.userId}`);
        await storage.upsertUser({
          id: auth.userId,
          clerkId: auth.userId,
          email: userInfo.email || dbUser.email,
          name: newName,
          role: dbUser.role,
        });
        console.log(`✅ User record updated for: ${auth.userId}`);
      }
    }
    
    req.user = userInfo;
    next();
  } catch (error) {
    console.error("❌ Error in requireAuth middleware:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
