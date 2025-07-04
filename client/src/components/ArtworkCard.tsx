import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/priceUtils";

interface ArtworkCardProps {
  artwork: {
    id: string;
    title: string;
    imageUrl: string;
    currentPrice: string;
    endTime: string;
    status?: string; // Add status field
    artist?: {
      firstName?: string;
      lastName?: string;
    };
  };
}

export default function ArtworkCard({ artwork }: ArtworkCardProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addToWatchlistMutation = useMutation({
    mutationFn: async (artworkId: string) => {
      await apiRequest("POST", "/api/watchlist", { artworkId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/watchlist"] });
      toast({
        title: "Added to watchlist",
        description: "Artwork has been added to your watchlist.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add to watchlist. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getTimeLeft = (endTime: string) => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return "Ended";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  const handleAddToWatchlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAuthenticated) {
      addToWatchlistMutation.mutate(artwork.id);
    } else {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to add items to your watchlist.",
        variant: "destructive",
      });
    }
  };

  // Helper function to get artwork status
  const getArtworkStatus = () => {
    const now = new Date();
    const endTime = new Date(artwork.endTime);
    
    if (artwork.status === "SOLD") {
      return { label: "Sold", variant: "default" as const, color: "bg-green-100 text-green-800" };
    } else if (artwork.status === "EXPIRED") {
      return { label: "Expired", variant: "secondary" as const, color: "bg-gray-100 text-gray-800" };
    } else if (now >= endTime) {
      return { label: "Ended", variant: "secondary" as const, color: "bg-gray-100 text-gray-800" };
    } else if (artwork.status === "ACTIVE") {
      return { label: "Active", variant: "default" as const, color: "bg-blue-100 text-blue-800" };
    } else {
      return { label: "Inactive", variant: "secondary" as const, color: "bg-gray-100 text-gray-800" };
    }
  };

  const canBid = () => {
    const now = new Date();
    const endTime = new Date(artwork.endTime);
    return artwork.status === "ACTIVE" && now < endTime;
  };

  return (
    <Card className="bg-white rounded-xl shadow-custom hover:shadow-lg transition-shadow overflow-hidden">
      <Link href={`/artwork/${artwork.id}`}>
        <img
          src={artwork.imageUrl}
          alt={artwork.title}
          className="w-full h-64 object-cover cursor-pointer"
        />
      </Link>
      <CardContent className="p-6">
        <Link href={`/artwork/${artwork.id}`}>
          <h3 className="text-xl font-semibold mb-2 cursor-pointer hover:text-primary">
            {artwork.title}
          </h3>
        </Link>
        <p className="text-secondary mb-2">
          by {artwork.artist?.firstName || "Unknown"} {artwork.artist?.lastName || "Artist"}
        </p>
        
        {/* Status Badge */}
        <div className="mb-4">
          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getArtworkStatus().color}`}>
            {getArtworkStatus().label}
          </span>
        </div>
        
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-sm text-secondary">Current Bid</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(artwork.currentPrice)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-secondary">Time Left</p>
            <p className="text-lg font-semibold text-red-600">{getTimeLeft(artwork.endTime)}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Link href={`/artwork/${artwork.id}`} className="flex-1">
            <Button className="w-full bg-primary text-white hover:bg-primary/90 transition-colors font-semibold" disabled={!canBid()}>
              {canBid() ? "Place Bid" : "View Details"}
            </Button>
          </Link>
          <Button
            variant="outline"
            size="icon"
            onClick={handleAddToWatchlist}
            disabled={addToWatchlistMutation.isPending}
          >
            <Heart className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
