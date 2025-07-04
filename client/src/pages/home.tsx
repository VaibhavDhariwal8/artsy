import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import ArtworkCard from "@/components/ArtworkCard";
import CategoryGrid from "@/components/CategoryGrid";
import StatsSection from "@/components/StatsSection";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { data: artworks, isLoading } = useQuery({
    queryKey: ["/api/artworks"],
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Live Auctions Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">Live Auctions</h2>
            <p className="text-xl text-secondary">Bid on these exceptional pieces ending soon</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="bg-white rounded-xl shadow-custom overflow-hidden">
                  <Skeleton className="w-full h-64" />
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-4" />
                    <div className="flex justify-between items-center mb-4">
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))
            ) : artworks?.length > 0 ? (
              artworks.map((artwork: any) => (
                <ArtworkCard key={artwork.id} artwork={artwork} />
              ))
            ) : (
              <div className="col-span-3 text-center py-12">
                <p className="text-lg text-secondary">No artworks available at the moment.</p>
                <p className="text-sm text-muted-foreground mt-2">Check back later for new auctions!</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <CategoryGrid />
      <StatsSection />
      <Footer />
    </div>
  );
}
