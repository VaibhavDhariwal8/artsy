import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useUpdateUserRole } from "@/hooks/useUpdateUserRole";
import { apiRequest } from "@/lib/queryClient";
import { getRoleDisplayName, getRoleBadgeVariant } from "@/lib/roleUtils";
import { 
  User, 
  Shield, 
  Trash2, 
  AlertTriangle, 
  Settings,
  Mail,
  Calendar,
  Crown
} from "lucide-react";

export default function AccountSettings() {
  const [, navigate] = useLocation();
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { userRole, isAdmin } = useUserRole();
  const { updateRole } = useUpdateUserRole();
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Account deletion mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/user/account");
    },
    onSuccess: async () => {
      toast({
        title: "Account deleted successfully",
        description: "Your account and all associated data have been permanently deleted.",
      });
      
      // Sign out and redirect to home
      await signOut();
      navigate("/");
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting account",
        description: error.message || "Failed to delete account. Please try again or contact support.",
        variant: "destructive",
      });
      
      // If there are active artworks with bids, show specific error
      if (error.message?.includes("active artworks with bids")) {
        setShowDeleteDialog(false);
      }
    },
  });

  const handleDeleteAccount = () => {
    if (deleteConfirmation.toLowerCase() !== "delete my account") {
      toast({
        title: "Invalid confirmation",
        description: "Please type 'DELETE MY ACCOUNT' exactly to confirm.",
        variant: "destructive",
      });
      return;
    }
    
    deleteAccountMutation.mutate();
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-secondary">Loading account settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Settings className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Account Settings</h1>
          </div>
          <p className="text-secondary">Manage your account preferences and data</p>
        </div>

        <div className="space-y-6">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Profile Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <img 
                  src={user?.imageUrl || "/default-avatar.png"} 
                  alt="Profile" 
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-xl font-semibold">
                      {user?.firstName || "Unknown"} {user?.lastName || ""}
                    </h3>
                    <Badge variant={getRoleBadgeVariant(userRole)}>
                      <Crown className="w-3 h-3 mr-1" />
                      {getRoleDisplayName(userRole)}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <Mail className="w-4 h-4 text-secondary" />
                    <p className="text-secondary">{user?.primaryEmailAddress?.emailAddress}</p>
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <Calendar className="w-4 h-4 text-secondary" />
                    <p className="text-secondary">
                      Member since {new Date(user?.createdAt || Date.now()).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-primary">
                    {user?.emailAddresses?.length || 0}
                  </p>
                  <p className="text-sm text-secondary">Email Addresses</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-primary">
                    {user?.phoneNumbers?.length || 0}
                  </p>
                  <p className="text-sm text-secondary">Phone Numbers</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-primary">
                    {user?.web3Wallets?.length || 0}
                  </p>
                  <p className="text-sm text-secondary">Connected Wallets</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Account Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Manage Profile</h4>
                  <p className="text-sm text-secondary">Update your profile information and preferences</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => window.open("/user-profile", "_blank")}
                >
                  Edit Profile
                </Button>
              </div>

              <div className="flex justify-between items-center p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Security Settings</h4>
                  <p className="text-sm text-secondary">Manage passwords, two-factor authentication</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => window.open("/user-profile#security", "_blank")}
                >
                  Security
                </Button>
              </div>

              {isAdmin && (
                <div className="flex justify-between items-center p-4 border rounded-lg bg-red-50">
                  <div>
                    <h4 className="font-medium text-red-800">Admin Access</h4>
                    <p className="text-sm text-red-600">You have administrator privileges</p>
                  </div>
                  <Badge variant="destructive">
                    <Shield className="w-3 h-3 mr-1" />
                    Admin
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200">
            <CardHeader className="border-b border-red-200">
              <CardTitle className="flex items-center space-x-2 text-red-700">
                <AlertTriangle className="w-5 h-5" />
                <span>Danger Zone</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Warning:</strong> Account deletion is permanent and cannot be undone. 
                  All your artworks, bids, and associated data will be permanently deleted.
                </AlertDescription>
              </Alert>

              <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                <h4 className="font-medium text-red-800 mb-2">Delete Account</h4>
                <p className="text-sm text-red-700 mb-4">
                  Permanently delete your account and remove all associated data. This action cannot be undone.
                </p>
                
                <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete My Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center space-x-2 text-red-600">
                        <AlertTriangle className="w-5 h-5" />
                        <span>Delete Account</span>
                      </AlertDialogTitle>
                      <AlertDialogDescription className="space-y-3">
                        <p>
                          <strong>This action is permanent and cannot be undone.</strong>
                        </p>
                        <p>Deleting your account will:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Permanently delete your profile and account data</li>
                          <li>Remove all your uploaded artworks</li>
                          <li>Delete all your bids and bidding history</li>
                          <li>Remove you from any watchlists</li>
                          <li>Cancel any active auctions (if no bids exist)</li>
                        </ul>
                        <p className="text-red-600 font-medium">
                          Note: You cannot delete your account if you have active artworks with existing bids. 
                          Please wait for those auctions to end first.
                        </p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="delete-confirmation">
                          Type "DELETE MY ACCOUNT" to confirm:
                        </Label>
                        <Input
                          id="delete-confirmation"
                          value={deleteConfirmation}
                          onChange={(e) => setDeleteConfirmation(e.target.value)}
                          placeholder="DELETE MY ACCOUNT"
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => {
                        setDeleteConfirmation("");
                        setShowDeleteDialog(false);
                      }}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        disabled={deleteAccountMutation.isPending || deleteConfirmation.toLowerCase() !== "delete my account"}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {deleteAccountMutation.isPending ? (
                          <>
                            <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Account
                          </>
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
