import React, { useState, useEffect, useCallback } from 'react';
import { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  Loader2, 
  User, 
  Briefcase, 
  Phone, 
  Mail, 
  Globe, 
  DollarSign,
  Camera,
  Sparkles,
  Edit2,
  Wrench,
  Settings
} from 'lucide-react';
import { FacebookIcon, InstagramIcon, TwitterIcon, WhatsAppIcon } from '@/components/icons/SocialIcons';
import ServiceCategoryModal from '@/components/ServiceCategoryModal';

type ServiceCategory = Database['public']['Enums']['service_category'];

interface ProviderProfileSetupProps {
  onComplete: () => void;
}

const ProviderProfileSetup = ({ onComplete }: ProviderProfileSetupProps) => {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    businessName: '',
    businessDescription: '',
    hourlyRate: '',
    yearsExperience: '',
    contactPhone: '',
    contactEmail: '',
    whatsappNumber: '',
    facebookUrl: '',
    instagramUrl: '',
    twitterUrl: '',
  });
  
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [portfolioImages, setPortfolioImages] = useState<File[]>([]);
  const [portfolioPreviews, setPortfolioPreviews] = useState<string[]>([]);
  const [existingPortfolioImages, setExistingPortfolioImages] = useState<string[]>([]);
  const [portfolioCaptions, setPortfolioCaptions] = useState<Record<string, string>>({});
  const [newImageCaptions, setNewImageCaptions] = useState<string[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [serviceCategoryModalOpen, setServiceCategoryModalOpen] = useState(false);

  const withTimeout = useCallback(<T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
    return new Promise((resolve, reject) => {
      const t = window.setTimeout(() => reject(new Error(`${label} timed out. Please try again.`)), ms);
      promise
        .then((v) => {
          window.clearTimeout(t);
          resolve(v);
        })
        .catch((e) => {
          window.clearTimeout(t);
          reject(e);
        });
    });
  }, []);

  // Load existing data
  useEffect(() => {
    const loadExistingData = async () => {
      if (!profile?.id) return;
      
      try {
        const { data: providerData } = await supabase
          .from('service_providers')
          .select('*')
          .eq('profile_id', profile.id)
          .maybeSingle();

        if (providerData) {
          setFormData({
            businessName: providerData.business_name || '',
            businessDescription: providerData.business_description || '',
            hourlyRate: providerData.hourly_rate?.toString() || '',
            yearsExperience: providerData.years_experience?.toString() || '',
            contactPhone: providerData.contact_phone || '',
            contactEmail: providerData.contact_email || '',
            whatsappNumber: providerData.whatsapp_number || '',
            facebookUrl: providerData.facebook_url || '',
            instagramUrl: providerData.instagram_url || '',
            twitterUrl: providerData.twitter_url || '',
          });
          setExistingPortfolioImages(providerData.portfolio_images || []);
          setPortfolioCaptions((providerData.portfolio_captions as Record<string, string>) || {});
          setServiceCategories((providerData.service_categories as ServiceCategory[]) || []);
        }
        
        if (profile?.avatar_url) {
          setProfileImagePreview(profile.avatar_url);
        }
      } catch (error) {
        console.error('Error loading existing data:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    loadExistingData();
  }, [profile]);

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Profile image must be less than 5MB',
          variant: 'destructive'
        });
        return;
      }
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePortfolioImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: `${file.name} is larger than 5MB`,
          variant: 'destructive'
        });
        return false;
      }
      return true;
    });
    
    setPortfolioImages([...portfolioImages, ...validFiles]);
    // Initialize captions for new images
    setNewImageCaptions([...newImageCaptions, ...validFiles.map(() => '')]);
    
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPortfolioPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePortfolioImage = (index: number) => {
    setPortfolioImages(portfolioImages.filter((_, i) => i !== index));
    setPortfolioPreviews(portfolioPreviews.filter((_, i) => i !== index));
    setNewImageCaptions(newImageCaptions.filter((_, i) => i !== index));
  };

  const removeExistingPortfolioImage = (index: number) => {
    const imageUrl = existingPortfolioImages[index];
    setExistingPortfolioImages(existingPortfolioImages.filter((_, i) => i !== index));
    // Remove caption for this image
    const newCaptions = { ...portfolioCaptions };
    delete newCaptions[imageUrl];
    setPortfolioCaptions(newCaptions);
  };

  const updateExistingCaption = (imageUrl: string, caption: string) => {
    setPortfolioCaptions(prev => ({
      ...prev,
      [imageUrl]: caption
    }));
  };

  const updateNewImageCaption = (index: number, caption: string) => {
    const newCaptions = [...newImageCaptions];
    newCaptions[index] = caption;
    setNewImageCaptions(newCaptions);
  };

  const uploadImage = async (file: File, path: string): Promise<string> => {
    if (!user) throw new Error('Not signed in');

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    const { error: uploadError } = await withTimeout(
      supabase.storage
        .from('provider-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        }),
      20000,
      'Image upload'
    );

    if (uploadError) {
      throw new Error(uploadError.message || 'Upload failed');
    }

    const { data } = supabase.storage.from('provider-images').getPublicUrl(filePath);
    if (!data?.publicUrl) throw new Error('Upload succeeded but no URL was returned');

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user) return;

    setLoading(true);
    setUploading(true);

    const totalUploads = (profileImage ? 1 : 0) + portfolioImages.length;
    let completed = 0;

    try {
      let profileImageUrl = profile.avatar_url;

      // Upload profile image if new one is selected
      if (profileImage) {
        setUploadProgress({ current: completed + 1, total: totalUploads });
        profileImageUrl = await uploadImage(profileImage, `profiles/${user.id}`);
        completed++;
      }

      // Upload new portfolio images and build captions map
      const newPortfolioUrls: string[] = [];
      const newCaptionsMap: Record<string, string> = { ...portfolioCaptions };

      for (let i = 0; i < portfolioImages.length; i++) {
        const image = portfolioImages[i];
        setUploadProgress({ current: completed + 1, total: totalUploads });
        const url = await uploadImage(image, `portfolio/${user.id}`);
        completed++;

        newPortfolioUrls.push(url);
        // Add caption for new image if provided
        if (newImageCaptions[i]) {
          newCaptionsMap[url] = newImageCaptions[i];
        }
      }

      // Combine existing and new portfolio images
      const allPortfolioImages = [...existingPortfolioImages, ...newPortfolioUrls];

      // Update profile with avatar (only if we uploaded a real URL)
      if (profileImageUrl && profileImageUrl !== profile.avatar_url) {
        await supabase
          .from('profiles')
          .update({ avatar_url: profileImageUrl })
          .eq('id', profile.id);
      }

      // Update or create service provider record
      const { data: existingProvider } = await supabase
        .from('service_providers')
        .select('id, service_categories')
        .eq('profile_id', profile.id)
        .maybeSingle();

      const providerData = {
        profile_id: profile.id,
        business_name: formData.businessName || null,
        business_description: formData.businessDescription || null,
        hourly_rate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : null,
        years_experience: formData.yearsExperience ? parseInt(formData.yearsExperience) : null,
        contact_phone: formData.contactPhone || null,
        contact_email: formData.contactEmail || null,
        whatsapp_number: formData.whatsappNumber || null,
        facebook_url: formData.facebookUrl || null,
        instagram_url: formData.instagramUrl || null,
        twitter_url: formData.twitterUrl || null,
        portfolio_images: allPortfolioImages.length > 0 ? allPortfolioImages : null,
        portfolio_captions: Object.keys(newCaptionsMap).length > 0 ? newCaptionsMap : null,
        service_categories: serviceCategories,
        updated_at: new Date().toISOString(),
      };

      if (existingProvider) {
        await supabase
          .from('service_providers')
          .update(providerData)
          .eq('id', existingProvider.id);
      } else {
        await supabase
          .from('service_providers')
          .insert({
            ...providerData,
            service_categories: serviceCategories
          });
      }

      toast({
        title: 'Profile Updated! ✨',
        description: 'Your changes are now live and visible to clients.',
      });

      onComplete();
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error?.message || 'Failed to update profile',
        variant: 'destructive'
      });
    } finally {
      setUploadProgress(null);
      setLoading(false);
      setUploading(false);
    }
  };

  if (initialLoading) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Loading your profile...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto border-border/50 shadow-elegant animate-fade-in">
      <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-secondary/5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl">Edit Your Profile</CardTitle>
            <CardDescription>
              Make your profile stand out to attract more clients
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Profile Picture Section */}
          <div className="flex flex-col md:flex-row items-start gap-8 pb-8 border-b">
            <div className="relative group">
              <div className="w-32 h-32 rounded-2xl overflow-hidden bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center border-2 border-dashed border-border group-hover:border-primary transition-colors">
                {profileImagePreview ? (
                  <img src={profileImagePreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-12 w-12 text-muted-foreground" />
                )}
              </div>
              <label className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer shadow-lg hover:bg-primary/90 transition-colors">
                <Camera className="h-5 w-5" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfileImageChange}
                  className="hidden"
                />
              </label>
            </div>
            <div className="flex-1">
              <Label className="text-lg font-semibold">Profile Picture</Label>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Upload a professional photo that represents you or your business. Max 5MB.
              </p>
              <Badge variant="outline" className="text-xs">
                Tip: A clear face or logo increases trust by 40%
              </Badge>
            </div>
          </div>

          {/* Business Info */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Business Information</h3>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  placeholder="Your business name"
                  className="h-12"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hourlyRate">Hourly Rate (ZMW)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="hourlyRate"
                      type="number"
                      value={formData.hourlyRate}
                      onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                      placeholder="0.00"
                      className="h-12 pl-10"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yearsExperience">Experience (Years)</Label>
                  <Input
                    id="yearsExperience"
                    type="number"
                    value={formData.yearsExperience}
                    onChange={(e) => setFormData({ ...formData, yearsExperience: e.target.value })}
                    placeholder="0"
                    className="h-12"
                    min="0"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessDescription">Bio / About Your Services</Label>
              <Textarea
                id="businessDescription"
                value={formData.businessDescription}
                onChange={(e) => setFormData({ ...formData, businessDescription: e.target.value })}
                placeholder="Tell clients about your services, experience, and what makes you stand out..."
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {formData.businessDescription.length}/500 characters
              </p>
            </div>
          </div>

          {/* Service Categories */}
          <div className="space-y-4 pt-6 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Services You Offer</h3>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setServiceCategoryModalOpen(true)}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                Manage Services
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Clients will find you based on these service categories.
            </p>
            
            {/* Display current services as badges */}
            <div className="flex flex-wrap gap-2 p-4 rounded-lg bg-muted/30 border min-h-[60px]">
              {serviceCategories.length > 0 ? (
                serviceCategories.map((cat) => (
                  <Badge key={cat} variant="secondary" className="capitalize">
                    {cat.replace('_', ' ')}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No services selected. Click "Manage Services" to add services.
                </p>
              )}
            </div>

            {/* Service Category Modal */}
            <ServiceCategoryModal
              open={serviceCategoryModalOpen}
              onOpenChange={setServiceCategoryModalOpen}
              selectedCategories={serviceCategories}
              onSave={setServiceCategories}
              disabled={loading}
            />
          </div>

          {/* Contact Information */}
          <div className="space-y-6 pt-6 border-t">
            <div className="flex items-center gap-2 mb-4">
              <Phone className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Contact Information</h3>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="contactPhone"
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="+260..."
                    className="h-12 pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="contact@example.com"
                    className="h-12 pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsappNumber">WhatsApp</Label>
                <div className="relative">
                  <WhatsAppIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600" />
                  <Input
                    id="whatsappNumber"
                    type="tel"
                    value={formData.whatsappNumber}
                    onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                    placeholder="+260..."
                    className="h-12 pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Social Media */}
          <div className="space-y-6 pt-6 border-t">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Social Media Links</h3>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="facebookUrl" className="flex items-center gap-2">
                  <FacebookIcon className="h-4 w-4 text-blue-600" />
                  Facebook
                </Label>
                <Input
                  id="facebookUrl"
                  type="url"
                  value={formData.facebookUrl}
                  onChange={(e) => setFormData({ ...formData, facebookUrl: e.target.value })}
                  placeholder="https://facebook.com/..."
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagramUrl" className="flex items-center gap-2">
                  <InstagramIcon className="h-4 w-4 text-pink-600" />
                  Instagram
                </Label>
                <Input
                  id="instagramUrl"
                  type="url"
                  value={formData.instagramUrl}
                  onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
                  placeholder="https://instagram.com/..."
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitterUrl" className="flex items-center gap-2">
                  <TwitterIcon className="h-4 w-4" />
                  X (Twitter)
                </Label>
                <Input
                  id="twitterUrl"
                  type="url"
                  value={formData.twitterUrl}
                  onChange={(e) => setFormData({ ...formData, twitterUrl: e.target.value })}
                  placeholder="https://x.com/..."
                  className="h-12"
                />
              </div>
            </div>
          </div>

          {/* Portfolio with Captions */}
          <div className="space-y-6 pt-6 border-t">
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Portfolio</h3>
            </div>
            
            <div className="space-y-4">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary transition-colors bg-muted/30">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Click to upload portfolio images</span>
                <span className="text-xs text-muted-foreground mt-1">Max 5MB per image</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePortfolioImageChange}
                  className="hidden"
                />
              </label>

              {/* Existing Portfolio Images with Captions */}
              {existingPortfolioImages.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground">Current Portfolio</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {existingPortfolioImages.map((url, index) => (
                      <div key={`existing-${index}`} className="relative group rounded-xl overflow-hidden border bg-card">
                        <div className="aspect-video relative">
                          <img src={url} alt={`Portfolio ${index + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeExistingPortfolioImage(index)}
                            className="absolute top-2 right-2 w-8 h-8 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Edit2 className="h-4 w-4 text-muted-foreground" />
                            <Label className="text-xs">Caption</Label>
                          </div>
                          <Input
                            placeholder="Describe this work..."
                            value={portfolioCaptions[url] || ''}
                            onChange={(e) => updateExistingCaption(url, e.target.value)}
                            className="text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Portfolio Images with Captions */}
              {portfolioPreviews.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground">New Images</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {portfolioPreviews.map((preview, index) => (
                      <div key={`new-${index}`} className="relative group rounded-xl overflow-hidden border bg-card">
                        <div className="aspect-video relative">
                          <img src={preview} alt={`New ${index + 1}`} className="w-full h-full object-cover" />
                          <Badge className="absolute top-2 left-2" variant="secondary">New</Badge>
                          <button
                            type="button"
                            onClick={() => removePortfolioImage(index)}
                            className="absolute top-2 right-2 w-8 h-8 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Edit2 className="h-4 w-4 text-muted-foreground" />
                            <Label className="text-xs">Caption</Label>
                          </div>
                          <Input
                            placeholder="Describe this work..."
                            value={newImageCaptions[index] || ''}
                            onChange={(e) => updateNewImageCaption(index, e.target.value)}
                            className="text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onComplete}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || uploading}
              className="min-w-[200px] bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading Images...
                </>
              ) : loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Save Profile
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProviderProfileSetup;
