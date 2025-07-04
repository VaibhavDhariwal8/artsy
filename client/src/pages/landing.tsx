import { Button } from "@/components/ui/button";
import { SignInButton, SignUpButton } from "@clerk/clerk-react";
import Header from "@/components/Header";
import CategoryGrid from "@/components/CategoryGrid";
import StatsSection from "@/components/StatsSection";
import Footer from "@/components/Footer";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="custom-gradient text-white py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                Discover & Bid on
                <span className="text-blue-200"> Exceptional</span>
                Artworks
              </h1>
              <p className="text-xl mb-8 text-blue-100">
                Connect with talented artists and collectors worldwide. Participate in live auctions and discover unique pieces that speak to your soul.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <SignInButton mode="modal">
                  <Button size="lg" className="bg-white text-primary hover:bg-blue-50">
                    Start Bidding
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-primary">
                    Sell Your Art
                  </Button>
                </SignUpButton>
              </div>
            </div>
            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                <img 
                  src="https://images.unsplash.com/photo-1541961017774-22349e4a1262?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=300" 
                  alt="Contemporary abstract painting" 
                  className="rounded-lg shadow-lg object-cover w-full h-48"
                />
                <img 
                  src="https://images.unsplash.com/photo-1578321272176-b7bbc0679853?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=300" 
                  alt="Modern sculpture artwork" 
                  className="rounded-lg shadow-lg object-cover w-full h-48 mt-8"
                />
                <img 
                  src="https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=300" 
                  alt="Classic oil painting portrait" 
                  className="rounded-lg shadow-lg object-cover w-full h-48 -mt-4"
                />
                <img 
                  src="https://images.unsplash.com/photo-1549490349-8643362247b5?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=300" 
                  alt="Digital art with neon colors" 
                  className="rounded-lg shadow-lg object-cover w-full h-48 mt-4"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <CategoryGrid />
      <StatsSection />
      <Footer />
    </div>
  );
}
