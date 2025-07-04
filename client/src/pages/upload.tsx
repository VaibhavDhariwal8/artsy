import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth, useUser } from "@clerk/clerk-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";
import { useUserRole } from "@/hooks/useUserRole";
import { canUploadArtworks } from "@/lib/roleUtils";
import { Upload as UploadIcon, ImageIcon, X, Shield } from "lucide-react";
import { useEffect } from "react";

const categories = [
  "Painting",
  "Photography",
  "Sculpture",
  "Digital Art",
  "Drawing",
  "Mixed Media",
];

const uploadSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  description: z.string().min(1, "Description is required").max(500, "Description must be less than 500 characters"),
  category: z.string().min(1, "Category is required"),
  startingPrice: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Starting price must be a positive number"),
  endTime: z.string().refine((date) => {
    const endDate = new Date(date);
    const now = new Date();
    return endDate > now;
  }, "End time must be in the future"),
  image: z.instanceof(File, { message: "Please select an image file" })
    .refine((file) => file.size <= 5000000, "File size must be less than 5MB")
    .refine(
      (file) => ["image/jpeg", "image/png", "image/webp", "image/jpg"].includes(file.type),
      "Only JPEG, PNG, and WebP files are allowed"
    ),
});

type UploadFormData = z.infer<typeof uploadSchema>;

export default function Upload() {
  const [, navigate] = useLocation();
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { authenticatedFetch } = useAuthenticatedFetch();
  const { userRole, isLoading: roleLoading } = useUserRole();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const form = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      startingPrice: "",
      endTime: "",
    },
  });

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to upload artwork.",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    // Check if user has permission to upload artworks
    if (isLoaded && isSignedIn && !roleLoading && !canUploadArtworks(userRole)) {
      toast({
        title: "Access Denied",
        description: "You need to be an artist to upload artworks.",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }
  }, [isLoaded, isSignedIn, navigate, toast, userRole, roleLoading]);

  // Show loading while checking permissions
  if (!isLoaded || roleLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-secondary">Checking permissions...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show access denied if user doesn't have permission
  if (!canUploadArtworks(userRole)) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="text-center">
            <CardContent className="p-8">
              <Shield className="w-16 h-16 mx-auto mb-4 text-red-500" />
              <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
              <p className="text-secondary mb-6">
                You need to be an artist to upload artworks. Please contact an admin to change your role.
              </p>
              <Button onClick={() => navigate("/dashboard")}>
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const uploadMutation = useMutation({
    mutationFn: async (data: UploadFormData) => {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('description', data.description);
      formData.append('category', data.category);
      formData.append('startingPrice', data.startingPrice);
      formData.append('endTime', new Date(data.endTime).toISOString());
      formData.append('image', data.image);

      const response = await authenticatedFetch("/api/artworks", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload artwork");
      }

      return response.json();
    },
    onSuccess: (artwork) => {
      queryClient.invalidateQueries({ queryKey: ["/api/artworks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/artworks"] });
      toast({
        title: "Artwork uploaded successfully!",
        description: "Your artwork is now live for bidding.",
      });
      navigate(`/artwork/${artwork.id}`);
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast({
        title: "Error uploading artwork",
        description: "Please try again or contact support if the problem persists.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UploadFormData) => {
    uploadMutation.mutate(data);
  };

  const getMinEndTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1); // Minimum 1 hour from now
    return now.toISOString().slice(0, 16);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setValue("image", file);
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const removeFile = () => {
    form.setValue("image", undefined as any);
    setPreviewUrl(null);
    // Reset the file input
    const fileInput = document.getElementById("image-upload") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
            <p className="text-gray-600">Please sign in to upload artwork.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="bg-white shadow-custom">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-foreground">Upload New Artwork</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter artwork title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your artwork..." 
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="startingPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Starting Price ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Auction End Time</FormLabel>
                        <FormControl>
                          <Input 
                            type="datetime-local" 
                            min={getMinEndTime()}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="image"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Artwork Image</FormLabel>
                      <FormControl>
                        <div className="space-y-4">
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                            <input
                              type="file"
                              id="image-upload"
                              accept="image/*"
                              onChange={handleFileChange}
                              className="hidden"
                            />
                            <label
                              htmlFor="image-upload"
                              className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                            >
                              <ImageIcon className="w-4 h-4" />
                              Choose Image
                            </label>
                            <p className="text-sm text-muted-foreground mt-2">
                              Upload JPEG, PNG, or WebP images up to 5MB
                            </p>
                          </div>
                          
                          {previewUrl && (
                            <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-4">
                              <Label className="text-sm font-medium text-foreground mb-2 block">Preview</Label>
                              <div className="relative">
                                <img 
                                  src={previewUrl} 
                                  alt="Preview" 
                                  className="max-w-full h-48 object-cover rounded-lg mx-auto"
                                />
                                <button
                                  type="button"
                                  onClick={removeFile}
                                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={uploadMutation.isPending}
                    className="bg-primary text-white hover:bg-primary/90 transition-colors font-semibold"
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <UploadIcon className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <UploadIcon className="w-4 h-4 mr-2" />
                        Upload Artwork
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/dashboard")}
                    className="font-semibold"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
      
      <Footer />
    </div>
  );
}
