import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClerkProviderWrapper } from "@/components/ClerkProvider";
import { useAuth } from "@clerk/clerk-react";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import ArtworkDetail from "@/pages/artwork-detail";
import Dashboard from "@/pages/dashboard";
import Upload from "@/pages/upload";
import Settings from "@/pages/settings";

function Router() {
  const { isSignedIn, isLoaded } = useAuth();

  return (
    <Switch>
      {!isLoaded || !isSignedIn ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/artwork/:id" component={ArtworkDetail} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/upload" component={Upload} />
          <Route path="/settings" component={Settings} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ClerkProviderWrapper>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProviderWrapper>
  );
}

export default App;
