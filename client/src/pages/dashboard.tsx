import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { Upload as UploadIcon, Gavel, Clock, TrendingUp, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/priceUtils";
import { canDeleteArtwork, canUploadArtworks, getRoleDisplayName, getRoleBadgeVariant } from "@/lib/roleUtils";
import { AdminDashboard } from "@/components/AdminDashboard";
import { RoleSelection } from "@/components/RoleSelection";

export default function Dashboard() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { userRole, isLoading: roleLoading, isAdmin, isArtist } = useUserRole();
  const [prevRole, setPrevRole] = useState<string | undefined>();
  
  // Track role changes and force refresh if role changes
  useEffect(() => {
    if (userRole && prevRole && userRole !== prevRole) {
      // Force a complete refresh of the dashboard
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
    if (userRole) {
      setPrevRole(userRole);
    }
  }, [userRole, prevRole]);
  
  // If user role is not set, show role selection
  if (!roleLoading && !userRole) {
    return (
      <RoleSelection 
        onRoleSelected={() => {
          // The role selection component now handles cache invalidation internally
          // Just wait a moment for the cache to update
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }} 
      />
    );
  }

  // Show loading state while role is being fetched
  if (roleLoading || !userRole) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <Skeleton className="h-8 w-64 mx-auto mb-4" />
            <Skeleton className="h-4 w-48 mx-auto mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // If user is admin, show admin dashboard
  if (isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AdminDashboard />
        </div>
        <Footer />
      </div>
    );
  }

  // Delete artwork mutation
  const deleteArtworkMutation = useMutation({
    mutationFn: async (artworkId: string) => {
      await apiRequest("DELETE", `/api/artworks/${artworkId}`);
    },
    onSuccess: (_, artworkId) => {
      // Trigger a refresh by invalidating queries
      queryClient.invalidateQueries({ queryKey: ["/api/user/artworks"] });
      
      // Also manually trigger refetch as backup
      refetchArtworks();
      
      toast({
        title: "Artwork deleted successfully",
        description: "Your artwork has been removed.",
      });
    },
    onError: (error: any) => {
      console.error('Delete failed:', error);
      toast({
        title: "Error deleting artwork",
        description: error.message || "Failed to delete artwork. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteArtwork = (artworkId: string, artworkTitle: string) => {
    if (confirm(`Are you sure you want to delete "${artworkTitle}"? This action cannot be undone.`)) {
      deleteArtworkMutation.mutate(artworkId);
    }
  };

  // Helper function to get artwork status display
  const getArtworkStatus = (artwork: any) => {
    const now = new Date();
    const endTime = new Date(artwork.endTime);
    
    if (artwork.status === "SOLD") {
      return { label: "Sold", variant: "default" as const, color: "text-green-600" };
    } else if (artwork.status === "EXPIRED") {
      return { label: "Expired", variant: "secondary" as const, color: "text-gray-600" };
    } else if (now >= endTime) {
      return { label: "Ended", variant: "secondary" as const, color: "text-gray-600" };
    } else if (artwork.isActive) {
      return { label: "Active", variant: "default" as const, color: "text-blue-600" };
    } else {
      return { label: "Inactive", variant: "secondary" as const, color: "text-gray-600" };
    }
  };

  // Helper function to check if artwork can be deleted
  const canDeleteArtworkItem = (artwork: any) => {
    const now = new Date();
    const endTime = new Date(artwork.endTime);
    const timeRemaining = endTime.getTime() - now.getTime();
    
    // Use role-based permission checking
    return canDeleteArtwork(userRole, user?.id || "", artwork.artistId) && 
           timeRemaining > 0 && 
           artwork.status === "ACTIVE";
  };

  const isAuthenticated = isSignedIn;
  const authLoading = !isLoaded;

  const { data: userArtworks, isLoading: artworksLoading, error: artworksError, refetch: refetchArtworks } = useQuery<any[]>({
    queryKey: ["/api/user/artworks"],
    enabled: isAuthenticated,
  });

  const { data: userBids, isLoading: bidsLoading, error: bidsError } = useQuery<any[]>({
    queryKey: ["/api/user/bids"],
    enabled: isAuthenticated,
  });

  const { data: watchlist, isLoading: watchlistLoading, error: watchlistError } = useQuery<any[]>({
    queryKey: ["/api/user/watchlist"],
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isSignedIn, isLoaded, toast]);

  useEffect(() => {
    const errors = [artworksError, bidsError, watchlistError];
    errors.forEach((error) => {
      if (error && isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      }
    });
  }, [artworksError, bidsError, watchlistError, toast]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Skeleton className="h-64" />
            <div className="lg:col-span-2">
              <Skeleton className="h-64" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">Your Dashboard</h1>
          <p className="text-xl text-secondary">Manage your artworks and bids</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Section */}
          <Card className="bg-white shadow-custom">
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <img 
                  src={user?.imageUrl || "/default-avatar.png"} 
                  alt="Profile" 
                  className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
                />
                <h3 className="text-xl font-semibold">
                  {user?.firstName || "User"} {user?.lastName || ""}
                </h3>
                <p className="text-secondary">{user?.primaryEmailAddress?.emailAddress}</p>
                <div className="mt-2">
                  <Badge variant={getRoleBadgeVariant(userRole)}>
                    {getRoleDisplayName(userRole)}
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-secondary">Artworks Listed</span>
                  <span className="font-semibold">{userArtworks?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Active Bids</span>
                  <span className="font-semibold">{userBids?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Watchlist Items</span>
                  <span className="font-semibold">{watchlist?.length || 0}</span>
                </div>
              </div>
              
              {canUploadArtworks(userRole) && (
                <Link href="/upload">
                  <Button className="w-full mt-6 bg-primary hover:bg-primary/90 transition-colors">
                    <UploadIcon className="w-4 h-4 mr-2" />
                    Upload New Artwork
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
          
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <Card className="bg-white shadow-custom">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bidsLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Skeleton className="w-12 h-12 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                        <Skeleton className="h-4 w-16" />
                      </div>
                    ))
                  ) : userBids && userBids.length > 0 ? (
                    userBids.slice(0, 5).map((bid: any) => (
                      <div key={bid.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                            <Gavel className="w-6 h-6 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium">Bid placed</p>
                            <p className="text-sm text-secondary">
                              ${bid.amount} on artwork
                            </p>
                          </div>
                        </div>
                        <span className="text-sm text-secondary">
                          {new Date(bid.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-secondary">No recent activity</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Start bidding on artworks to see your activity here!
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Your Artworks - Only show for artists */}
        {isArtist && (
          <Card className="mt-8 bg-white shadow-custom">
            <CardHeader>
              <CardTitle>Your Artworks</CardTitle>
            </CardHeader>
            <CardContent>
              {artworksLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-4">
                      <Skeleton className="h-48 w-full rounded-lg" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : userArtworks && userArtworks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userArtworks.map((artwork: any) => {
                    const status = getArtworkStatus(artwork);
                    const canDelete = canDeleteArtworkItem(artwork);
                    
                    return (
                      <div key={artwork.id} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                        <Link href={`/artwork/${artwork.id}`}>
                          <img
                            src={artwork.imageUrl}
                            alt={artwork.title}
                            className="w-full h-48 object-cover cursor-pointer"
                          />
                        </Link>
                        <div className="p-4">
                          <h3 className="font-semibold text-foreground mb-2">{artwork.title}</h3>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-secondary">Current Price</span>
                            <span className="font-semibold text-primary">{formatCurrency(artwork.currentPrice)}</span>
                          </div>
                          <div className="flex justify-between items-center mb-3">
                            <Badge variant={status.variant} className={status.color}>
                              {status.label}
                            </Badge>
                            <span className="text-xs text-secondary">
                              {new Date(artwork.endTime).toLocaleDateString()}
                            </span>
                          </div>
                          {canDelete && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteArtwork(artwork.id, artwork.title)}
                              disabled={deleteArtworkMutation.isPending}
                              className="w-full"
                            >
                              {deleteArtworkMutation.isPending ? (
                                <>
                                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                                  Deleting...
                                </>
                              ) : (
                                <>
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Artwork
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-secondary mb-4">You haven't uploaded any artworks yet</p>
                  <Link href="/upload">
                    <Button>
                      <UploadIcon className="w-4 h-4 mr-2" />
                      Upload Your First Artwork
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      
      <Footer />
    </div>
  );
}
