import { useQuery } from "@tanstack/react-query";

export default function StatsSection() {
  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
  });

  const defaultStats = {
    totalArtworks: 15000,
    totalArtists: 8500,
    totalSales: "2.4M",
    totalCollectors: 25000,
  };

  const displayStats = stats || defaultStats;

  return (
    <section className="py-16 bg-primary text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold mb-2">{displayStats.totalArtworks.toLocaleString()}+</div>
            <div className="text-blue-200">Artworks Listed</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-2">{displayStats.totalArtists.toLocaleString()}+</div>
            <div className="text-blue-200">Active Artists</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-2">${displayStats.totalSales}+</div>
            <div className="text-blue-200">Total Sales</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-2">{displayStats.totalCollectors.toLocaleString()}+</div>
            <div className="text-blue-200">Happy Collectors</div>
          </div>
        </div>
      </div>
    </section>
  );
}
