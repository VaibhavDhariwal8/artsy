import { useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useUpdateUserRole } from "@/hooks/useUpdateUserRole";
import { UserRole, getRoleDisplayName, getRoleColor, getRoleBadgeVariant } from "@/lib/roleUtils";
import { Palette, Gavel, Shield, ArrowRight } from "lucide-react";

interface RoleSelectionProps {
  onRoleSelected: (role: UserRole) => void;
  currentRole?: UserRole;
}

export function RoleSelection({ onRoleSelected, currentRole }: RoleSelectionProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const { updateRole } = useUpdateUserRole();
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentRole || "BIDDER");
  const [isLoading, setIsLoading] = useState(false);

  const roleOptions = [
    {
      value: "BIDDER" as UserRole,
      label: "Bidder",
      description: "Browse and bid on artworks",
      icon: Gavel,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      value: "ARTIST" as UserRole,
      label: "Artist",
      description: "Upload and sell your artwork",
      icon: Palette,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  const handleRoleUpdate = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      await updateRole(selectedRole);
      
      toast({
        title: "Role updated successfully",
        description: `You are now registered as a ${getRoleDisplayName(selectedRole)}`,
      });
      
      onRoleSelected(selectedRole);
    } catch (error: any) {
      toast({
        title: "Error updating role",
        description: error.message || "Failed to update role. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Choose Your Role</CardTitle>
          <p className="text-secondary">
            Select how you'd like to use SmartTaskTracker
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup
            value={selectedRole}
            onValueChange={(value) => setSelectedRole(value as UserRole)}
            className="space-y-4"
          >
            {roleOptions.map((option) => {
              const Icon = option.icon;
              return (
                <div key={option.value} className="flex items-center space-x-3">
                  <RadioGroupItem value={option.value} id={option.value} />
                  <Label
                    htmlFor={option.value}
                    className={`flex-1 cursor-pointer p-4 border-2 rounded-lg transition-all ${
                      selectedRole === option.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-full ${option.bgColor} flex items-center justify-center`}>
                        <Icon className={`w-6 h-6 ${option.color}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-lg">{option.label}</h3>
                          <Badge variant={getRoleBadgeVariant(option.value)}>
                            {getRoleDisplayName(option.value)}
                          </Badge>
                        </div>
                        <p className="text-secondary text-sm mt-1">{option.description}</p>
                      </div>
                    </div>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>

          <div className="pt-4 border-t">
            <Button
              onClick={handleRoleUpdate}
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                "Updating..."
              ) : (
                <>
                  Continue as {getRoleDisplayName(selectedRole)}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>

          <div className="text-center text-sm text-secondary">
            <p>
              Don't worry, you can change this later in your profile settings.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
