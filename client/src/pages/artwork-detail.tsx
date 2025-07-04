import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import Header from "@/components/Header";
import BidForm from "@/components/BidForm";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { formatCurrency } from "@/lib/priceUtils";

export default function ArtworkDetail() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const { data: artwork, isLoading, error } = useQuery({
    queryKey: [`/api/artworks/${id}`],
    enabled: !!id,
  }) as { data: any; isLoading: boolean; error: any };

  const { data: bids, isLoading: bidsLoading } = useQuery({
    queryKey: [`/api/artworks/${id}/bids`],
    enabled: !!id,
  }) as { data: any[]; isLoading: boolean; error: any };

  useEffect(() => {
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
  }, [error, toast]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!id) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const socket = new WebSocket(wsUrl);
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'NEW_BID' && data.artworkId === id) {
        // Refresh artwork and bids data
        // This would typically be handled by React Query's real-time updates
      }
    };
    
    return () => socket.close();
  }, [id]);

  const getTimeLeft = (endTime: string) => {
    const now = new Date();
    const end = new Date(endTime);
    
    // Check if the date is valid
    if (isNaN(end.getTime())) {
      return "Invalid Date";
    }
    
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return "Auction Ended";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else {
      return `${minutes}m ${seconds}s`;
    }
  };

  // Helper function to check if bidding is allowed
  const canPlaceBid = (artwork: any) => {
    const now = new Date();
    const endTime = new Date(artwork.endTime);
    return isAuthenticated && artwork.status === "ACTIVE" && now < endTime;
  };

  // Helper function to get artwork status display
  const getArtworkStatusMessage = (artwork: any) => {
    const now = new Date();
    const endTime = new Date(artwork.endTime);
    
    if (artwork.status === "SOLD") {
      return {
        message: "This auction has ended. The artwork has been sold to the highest bidder.",
        color: "text-green-600",
        showBidForm: false
      };
    } else if (artwork.status === "EXPIRED") {
      return {
        message: "This auction has ended with no bids. The artwork is no longer available.",
        color: "text-gray-600",
        showBidForm: false
      };
    } else if (now >= endTime) {
      return {
        message: "This auction has ended. Processing final status...",
        color: "text-gray-600",
        showBidForm: false
      };
    } else if (artwork.status === "ACTIVE") {
      return {
        message: "Auction is active. Place your bids now!",
        color: "text-green-600",
        showBidForm: true
      };
    } else {
      return {
        message: "This auction is not currently active.",
        color: "text-gray-600",
        showBidForm: false
      };
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="w-full h-96 rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!artwork) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Artwork Not Found</h1>
            <p className="text-secondary">The artwork you're looking for doesn't exist or has been removed.</p>
          </div>
        </div>
      </div>
    );
  }

  const { message, color, showBidForm } = getArtworkStatusMessage(artwork);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <img
              src={artwork.imageUrl}
              alt={artwork.title}
              className="w-full h-96 object-cover rounded-lg shadow-lg"
            />
          </div>
          
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{artwork.title}</h1>
              <p className="text-lg text-secondary mb-4">
                by {artwork.artist?.firstName && artwork.artist.firstName.trim() 
                  ? `${artwork.artist.firstName} ${artwork.artist.lastName || ''}`.trim()
                  : artwork.artist?.email 
                  ? artwork.artist.email
                  : "Unknown Artist"}
              </p>
              <Badge variant="secondary" className="mb-4">
                {artwork.category}
              </Badge>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-secondary">Time Remaining</span>
                <span className="text-lg font-semibold text-red-600">
                  {getTimeLeft(artwork.endTime)}
                </span>
              </div>
              
              {(() => {
                const status = getArtworkStatusMessage(artwork);
                return (
                  <div className="space-y-4">
                    <Card className="bg-gray-50 border-gray-200">
                      <CardContent className="p-4 text-center">
                        <p className={`font-medium ${status.color}`}>{status.message}</p>
                      </CardContent>
                    </Card>
                    
                    {status.showBidForm && canPlaceBid(artwork) && (
                      <BidForm
                        artworkId={artwork.id}
                        currentPrice={artwork.currentPrice}
                      />
                    )}
                    
                    {!isAuthenticated && status.showBidForm && (
                      <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="p-4 text-center">
                          <p className="text-blue-700 mb-2">Sign in to place bids</p>
                          <a href="/api/login" className="text-blue-600 hover:underline">
                            Sign in or create an account
                          </a>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                );
              })()}
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Description</h3>
              <p className="text-secondary">{artwork.description}</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Bids</CardTitle>
              </CardHeader>
              <CardContent>
                {bidsLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    ))}
                  </div>
                ) : bids?.length > 0 ? (
                  <div className="space-y-2">
                    {bids.slice(0, 5).map((bid: any) => (
                      <div key={bid.id} className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm text-secondary">
                          {bid.bidder?.firstName || "Anonymous"} {bid.bidder?.lastName || ""}
                        </span>
                        <span className="font-semibold">{formatCurrency(bid.amount)}</span>
                        <span className="text-xs text-secondary">
                          {new Date(bid.createdAt).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-secondary text-center py-4">No bids yet. Be the first to bid!</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
