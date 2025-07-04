import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/priceUtils";

interface BidFormProps {
  artworkId: string;
  currentPrice: string;
  onBidPlaced?: () => void;
}

export default function BidForm({ artworkId, currentPrice, onBidPlaced }: BidFormProps) {
  const [bidAmount, setBidAmount] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const placeBidMutation = useMutation({
    mutationFn: async (amount: string) => {
      await apiRequest("POST", "/api/bids", {
        artworkId,
        amount,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/artworks", artworkId] });
      queryClient.invalidateQueries({ queryKey: ["/api/artworks", artworkId, "bids"] });
      setBidAmount("");
      onBidPlaced?.();
      toast({
        title: "Bid placed successfully!",
        description: "Your bid has been placed. Good luck!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error placing bid",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(bidAmount);
    const current = parseFloat(currentPrice);

    if (amount <= current) {
      toast({
        title: "Invalid bid amount",
        description: "Your bid must be higher than the current price.",
        variant: "destructive",
      });
      return;
    }

    placeBidMutation.mutate(bidAmount);
  };

  return (
    <Card className="bg-gray-50">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-2">
          <Label className="text-sm text-secondary">Current Bid</Label>
          <span className="text-2xl font-bold text-primary">{formatCurrency(currentPrice)}</span>
        </div>
        <form onSubmit={handleSubmit} className="bidding-pulse">
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.01"
              min={parseFloat(currentPrice) + 0.01}
              placeholder="Enter bid amount"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              className="flex-1"
              required
            />
            <Button
              type="submit"
              disabled={placeBidMutation.isPending}
              className="bg-primary text-white hover:bg-primary/90 transition-colors font-semibold"
            >
              {placeBidMutation.isPending ? "Placing..." : "Place Bid"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
