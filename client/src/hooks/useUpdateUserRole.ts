import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { UserRole } from "@/lib/roleUtils";

/**
 * Hook to update user role with proper cache invalidation
 */
export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  
  const updateRole = async (role: UserRole) => {
    // Update the role via API
    await apiRequest("PUT", "/api/user/role", { role });
    
    // Clear all cache data first
    queryClient.removeQueries({ queryKey: ["/api/user/role"] });
    queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
    
    // Set the new role immediately in the cache
    queryClient.setQueryData(["/api/user/role"], role);
    
    // Invalidate all related queries
    await queryClient.invalidateQueries({ queryKey: ["/api/user/role"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/admin"] });
    
    // Force refetch to ensure consistency
    await queryClient.refetchQueries({ queryKey: ["/api/user/role"] });
    
    return role;
  };
  
  return { updateRole };
}
