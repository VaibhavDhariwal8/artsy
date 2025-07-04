import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { UserRole } from "@/lib/roleUtils";
import { getQueryFn } from "@/lib/queryClient";

export function useUserRole() {
  const { isSignedIn } = useAuth();
  
  const { data: userRole, isLoading, error } = useQuery<UserRole>({
    queryKey: ["/api/user/role"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: isSignedIn,
    staleTime: 0, // Always consider data stale to ensure fresh fetches
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true, // Always refetch on mount
    retry: 2, // Retry failed requests
  });

  return {
    userRole: userRole,
    isLoading,
    isArtist: userRole === "ARTIST",
    isAdmin: userRole === "ADMIN",
    isBidder: userRole === "BIDDER",
  };
}