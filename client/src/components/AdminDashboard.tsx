import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { UserRole, getRoleDisplayName, getRoleBadgeVariant } from "@/lib/roleUtils";
import { formatCurrency } from "@/lib/priceUtils";
import { 
  Users, 
  Palette, 
  TrendingUp, 
  DollarSign, 
  Trash2, 
  Edit,
  Shield,
  Search,
  Filter
} from "lucide-react";

export function AdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "ALL">("ALL");

  // Fetch admin statistics
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<any>({
    queryKey: ["/api/admin/stats"],
    retry: 2,
  });

  // Fetch all users
  const { data: users, isLoading: usersLoading, error: usersError } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    retry: 2,
  });

  // Fetch all artworks
  const { data: artworks, isLoading: artworksLoading, error: artworksError } = useQuery<any[]>({
    queryKey: ["/api/admin/artworks"],
    retry: 2,
  });

  // Fetch all bids
  const { data: bids, isLoading: bidsLoading, error: bidsError } = useQuery<any[]>({
    queryKey: ["/api/admin/bids"],
    retry: 2,
  });

  // Update user role mutation
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      await apiRequest("PUT", `/api/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User role updated successfully",
        description: "The user's role has been changed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating user role",
        description: error.message || "Failed to update user role.",
        variant: "destructive",
      });
    },
  });

  // Delete artwork mutation
  const deleteArtworkMutation = useMutation({
    mutationFn: async (artworkId: string) => {
      await apiRequest("DELETE", `/api/admin/artworks/${artworkId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/artworks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Artwork deleted successfully",
        description: "The artwork has been removed from the platform.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting artwork",
        description: error.message || "Failed to delete artwork.",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "User deleted successfully",
        description: "The user account has been permanently deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting user",
        description: error.message || "Failed to delete user account.",
        variant: "destructive",
      });
    },
  });

  // Filter users based on search and role
  const filteredUsers = users?.filter((user) => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    updateUserRoleMutation.mutate({ userId, role: newRole });
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    if (confirm(`Are you sure you want to permanently delete the account for "${userName}"? This will delete all their artworks, bids, and cannot be undone.`)) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleDeleteArtwork = (artworkId: string, artworkTitle: string) => {
    if (confirm(`Are you sure you want to delete "${artworkTitle}"? This action cannot be undone.`)) {
      deleteArtworkMutation.mutate(artworkId);
    }
  };

  // Show error state if any critical queries fail
  if (statsError || usersError || artworksError || bidsError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-secondary">Manage users, artworks, and monitor platform activity</p>
          </div>
          <Badge variant="destructive" className="flex items-center space-x-2">
            <Shield className="w-4 h-4" />
            <span>Admin Access</span>
          </Badge>
        </div>
        
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 text-lg">⚠️</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-800">Admin Dashboard Error</h3>
                <p className="text-red-700">
                  Failed to load admin data. Please check your admin permissions and try again.
                </p>
                {statsError && <p className="text-sm text-red-600">Stats: {statsError.message}</p>}
                {usersError && <p className="text-sm text-red-600">Users: {usersError.message}</p>}
                {artworksError && <p className="text-sm text-red-600">Artworks: {artworksError.message}</p>}
                {bidsError && <p className="text-sm text-red-600">Bids: {bidsError.message}</p>}
              </div>
            </div>
            <div className="mt-4">
              <Button 
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/admin/artworks"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/admin/bids"] });
                }}
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-secondary">Manage users, artworks, and monitor platform activity</p>
        </div>
        <Badge variant="destructive" className="flex items-center space-x-2">
          <Shield className="w-4 h-4" />
          <span>Admin Access</span>
        </Badge>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary">Total Users</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? <Skeleton className="h-8 w-16" /> : stats?.totalUsers || 0}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary">Total Artworks</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? <Skeleton className="h-8 w-16" /> : stats?.totalArtworks || 0}
                </p>
              </div>
              <Palette className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary">Total Bids</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? <Skeleton className="h-8 w-16" /> : stats?.totalBids || 0}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary">Total Revenue</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? <Skeleton className="h-8 w-16" /> : formatCurrency(stats?.totalRevenue || 0)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>User Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search and Filter */}
          <div className="flex space-x-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-secondary" />
              <Input
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as UserRole | "ALL")}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Roles</SelectItem>
                <SelectItem value="BIDDER">Bidders</SelectItem>
                <SelectItem value="ARTIST">Artists</SelectItem>
                <SelectItem value="ADMIN">Admins</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">User</th>
                  <th className="text-left p-4">Role</th>
                  <th className="text-left p-4">Joined</th>
                  <th className="text-left p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <Skeleton className="w-10 h-10 rounded-full" />
                          <div>
                            <Skeleton className="h-4 w-32 mb-1" />
                            <Skeleton className="h-3 w-48" />
                          </div>
                        </div>
                      </td>
                      <td className="p-4"><Skeleton className="h-6 w-20" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="p-4"><Skeleton className="h-8 w-32" /></td>
                    </tr>
                  ))
                ) : filteredUsers?.length ? (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium">
                              {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{user.name || "Unknown"}</p>
                            <p className="text-sm text-secondary">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {getRoleDisplayName(user.role)}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-secondary">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="p-4">
                        <Select
                          value={user.role}
                          onValueChange={(value) => handleRoleChange(user.id, value as UserRole)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BIDDER">Bidder</SelectItem>
                            <SelectItem value="ARTIST">Artist</SelectItem>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id, user.name || user.email)}
                          disabled={deleteUserMutation.isPending}
                          className="ml-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center py-8">
                      <p className="text-secondary">No users found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Artwork Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Palette className="w-5 h-5" />
            <span>Artwork Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">Artwork</th>
                  <th className="text-left p-4">Artist</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Current Price</th>
                  <th className="text-left p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {artworksLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <Skeleton className="w-16 h-16 rounded" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                      </td>
                      <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="p-4"><Skeleton className="h-6 w-16" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="p-4"><Skeleton className="h-8 w-24" /></td>
                    </tr>
                  ))
                ) : artworks?.length ? (
                  artworks.map((artwork) => (
                    <tr key={artwork.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <img
                            src={artwork.imageUrl}
                            alt={artwork.title}
                            className="w-16 h-16 object-cover rounded"
                          />
                          <div>
                            <p className="font-medium">{artwork.title}</p>
                            <p className="text-sm text-secondary">{artwork.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm">
                          {artwork.artist?.name || artwork.artist?.email || "Unknown"}
                        </span>
                      </td>
                      <td className="p-4">
                        <Badge variant={artwork.status === "ACTIVE" ? "default" : "secondary"}>
                          {artwork.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <span className="font-medium">
                          {formatCurrency(artwork.currentPrice)}
                        </span>
                      </td>
                      <td className="p-4">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteArtwork(artwork.id, artwork.title)}
                          disabled={deleteArtworkMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-8">
                      <p className="text-secondary">No artworks found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
