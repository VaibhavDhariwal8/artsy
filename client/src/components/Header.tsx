import { useAuth, useUser, SignInButton, SignUpButton, UserButton } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, Search, User } from "lucide-react";
import { Link } from "wouter";

export default function Header() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/">
                <h1 className="text-2xl font-bold text-primary cursor-pointer">ArtBid</h1>
              </Link>
            </div>
            <nav className="hidden md:ml-8 md:flex space-x-8">
              <Link href="/" className="text-foreground hover:text-primary transition-colors">
                Browse Artworks
              </Link>
              <a href="#categories" className="text-foreground hover:text-primary transition-colors">
                Categories
              </a>
              <a href="#artists" className="text-foreground hover:text-primary transition-colors">
                Artists
              </a>
              <a href="#how-it-works" className="text-foreground hover:text-primary transition-colors">
                How It Works
              </a>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden md:block">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <Button variant="ghost" size="icon">
              <Heart className="h-5 w-5" />
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                3
              </span>
            </Button>
            {isSignedIn ? (
              <div className="flex items-center space-x-4">
                <Link href="/dashboard">
                  <Button variant="ghost">Dashboard</Button>
                </Link>
                <Link href="/upload">
                  <Button>Upload Art</Button>
                </Link>
                <Link href="/settings">
                  <Button variant="ghost">Settings</Button>
                </Link>
                <UserButton 
                  appearance={{
                    elements: {
                      avatarBox: "h-8 w-8"
                    }
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <SignInButton mode="modal">
                  <Button variant="outline">Sign In</Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button>Sign Up</Button>
                </SignUpButton>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
