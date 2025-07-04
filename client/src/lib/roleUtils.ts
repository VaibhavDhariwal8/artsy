// Define user roles
export type UserRole = "BIDDER" | "ARTIST" | "ADMIN";

// Define permissions for each role
export const PERMISSIONS = {
  BIDDER: {
    canBid: true,
    canViewArtworks: true,
    canViewProfile: true,
    canUploadArtworks: false,
    canDeleteOwnArtworks: false,
    canEditOwnArtworks: false,
    canAccessDashboard: true,
    canViewAllUsers: false,
    canDeleteAnyArtwork: false,
    canViewAllBids: false,
    canManageUsers: false,
    canViewAnalytics: false,
  },
  ARTIST: {
    canBid: true,
    canViewArtworks: true,
    canViewProfile: true,
    canUploadArtworks: true,
    canDeleteOwnArtworks: true,
    canEditOwnArtworks: true,
    canAccessDashboard: true,
    canViewAllUsers: false,
    canDeleteAnyArtwork: false,
    canViewAllBids: false,
    canManageUsers: false,
    canViewAnalytics: false,
  },
  ADMIN: {
    canBid: true,
    canViewArtworks: true,
    canViewProfile: true,
    canUploadArtworks: true,
    canDeleteOwnArtworks: true,
    canEditOwnArtworks: true,
    canAccessDashboard: true,
    canViewAllUsers: true,
    canDeleteAnyArtwork: true,
    canViewAllBids: true,
    canManageUsers: true,
    canViewAnalytics: true,
  },
} as const;

// Get user permissions based on role
export function getUserPermissions(role: UserRole) {
  return PERMISSIONS[role] || PERMISSIONS.BIDDER;
}

// Check if user has specific permission
export function hasPermission(userRole: UserRole, permission: keyof typeof PERMISSIONS.BIDDER): boolean {
  const permissions = getUserPermissions(userRole);
  return permissions[permission];
}

// Check if user can perform action on artwork
export function canModifyArtwork(userRole: UserRole, userId: string, artworkOwnerId: string): boolean {
  if (userRole === "ADMIN") return true;
  if (userRole === "ARTIST" && userId === artworkOwnerId) return true;
  return false;
}

// Check if user can delete artwork
export function canDeleteArtwork(userRole: UserRole, userId: string, artworkOwnerId: string): boolean {
  if (userRole === "ADMIN") return true;
  if (userRole === "ARTIST" && userId === artworkOwnerId) return true;
  return false;
}

// Check if user can access admin features
export function isAdmin(userRole: UserRole): boolean {
  return userRole === "ADMIN";
}

// Check if user can upload artworks
export function canUploadArtworks(userRole: UserRole): boolean {
  return userRole === "ARTIST" || userRole === "ADMIN";
}

// Get user role display name
export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case "BIDDER":
      return "Bidder";
    case "ARTIST":
      return "Artist";
    case "ADMIN":
      return "Admin";
    default:
      return "User";
  }
}

// Get role color for UI
export function getRoleColor(role: UserRole): string {
  switch (role) {
    case "BIDDER":
      return "text-blue-600";
    case "ARTIST":
      return "text-purple-600";
    case "ADMIN":
      return "text-red-600";
    default:
      return "text-gray-600";
  }
}

// Get role badge variant
export function getRoleBadgeVariant(role: UserRole): "default" | "secondary" | "destructive" | "outline" {
  switch (role) {
    case "BIDDER":
      return "default";
    case "ARTIST":
      return "secondary";
    case "ADMIN":
      return "destructive";
    default:
      return "outline";
  }
}
