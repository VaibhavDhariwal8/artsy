import { Card, CardContent } from "@/components/ui/card";

const categories = [
  { name: "Paintings", emoji: "🎨", count: "2,456 works" },
  { name: "Photography", emoji: "📸", count: "1,234 works" },
  { name: "Sculptures", emoji: "🗿", count: "892 works" },
  { name: "Digital Art", emoji: "💻", count: "1,567 works" },
  { name: "Drawings", emoji: "✏️", count: "743 works" },
  { name: "Mixed Media", emoji: "🖼️", count: "521 works" },
];

export default function CategoryGrid() {
  return (
    <section className="py-16 bg-gray-50" id="categories">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-foreground mb-4">Browse by Category</h2>
          <p className="text-xl text-secondary">Explore our diverse collection of artistic styles</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {categories.map((category) => (
            <Card key={category.name} className="bg-white hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-3">{category.emoji}</div>
                <h3 className="font-semibold text-foreground">{category.name}</h3>
                <p className="text-sm text-secondary">{category.count}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
