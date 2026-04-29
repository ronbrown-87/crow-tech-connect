import Navbar from '@/components/Navbar';
import ProviderProfileSetup from '@/components/ProviderProfileSetup';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/currency';
import {
  AlertTriangle,
  Award,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  Eye,
  Image as ImageIcon,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Settings,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  User,
  Zap
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FacebookIcon, InstagramIcon, TwitterIcon, WhatsAppIcon } from '@/components/icons/SocialIcons';

interface ServiceRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  location: string;
  created_at: string;
  services: { name: string; category: string };
  profiles?: { full_name: string; email: string };
}

interface ServiceProvider {
  id: string;
  business_name: string;
  business_description: string;
  service_categories: string[];
  hourly_rate: number;
  rating: number;
  total_jobs: number;
  years_experience: number;
  portfolio_images: string[];
  facebook_url: string;
  instagram_url: string;
  twitter_url: string;
  whatsapp_number: string;
  contact_phone: string;
  contact_email: string;
  latitude: number | null;
  longitude: number | null;
}

const ServiceProviderDashboard = () => {
  const { profile, signOut, deleteAccount } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [serviceProvider, setServiceProvider] = useState<ServiceProvider | null>(null);
  const [availableRequests, setAvailableRequests] = useState<ServiceRequest[]>([]);
  const [myJobs, setMyJobs] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const fetchServiceProviderData = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const { data, error } = await supabase
        .from('service_providers')
        .select('*')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setServiceProvider(data);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error fetching service provider data:', errorMessage);
      toast({
        title: 'Error',
        description: 'Failed to fetch service provider data',
        variant: 'destructive'
      });
    }
  }, [profile?.id, toast]);

  useEffect(() => {
    if (profile?.user_id) {
      fetchServiceProviderData();
    }
  }, [profile?.user_id, fetchServiceProviderData]);

  // Auto-update provider location when they access dashboard
  useEffect(() => {
    if (!serviceProvider?.id) return;
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        // Only update if location changed significantly (>100m)
        const currentLat = serviceProvider.latitude;
        const currentLng = serviceProvider.longitude;
        if (currentLat && currentLng) {
          const dist = Math.sqrt(
            Math.pow((latitude - currentLat) * 111320, 2) +
            Math.pow((longitude - currentLng) * 111320 * Math.cos(currentLat * Math.PI / 180), 2)
          );
          if (dist < 100) return; // Less than 100m change, skip
        }
        await supabase
          .from('service_providers')
          .update({ latitude, longitude })
          .eq('id', serviceProvider.id);
        console.log('Provider location updated:', latitude, longitude);
      },
      (err) => console.warn('Could not update provider location:', err.message),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [serviceProvider?.id]);

  const fetchAvailableRequests = useCallback(async () => {
    try {
      if (!serviceProvider?.service_categories || serviceProvider.service_categories.length === 0) {
        setAvailableRequests([]);
        return;
      }

      const { data, error } = await supabase
        .from('service_requests')
        .select(`
          *,
          services!inner(name, category),
          profiles!service_requests_client_id_fkey(full_name, email)
        `)
        .eq('status', 'pending')
        .is('service_provider_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      type RequestWithService = ServiceRequest & { 
        services?: { name: string; category?: string };
        profiles?: { full_name: string; email: string };
      };
      
      const filteredRequests = (data || []).filter((request: RequestWithService) => {
        if (!request.services?.category) return false;
        const category = request.services.category as string;
        return serviceProvider.service_categories.includes(category);
      }).map((req: RequestWithService): ServiceRequest => ({
        ...req,
        services: { 
          name: req.services?.name || '', 
          category: req.services?.category || '' 
        }
      }));

      setAvailableRequests(filteredRequests);
      setLoading(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error fetching available requests:', errorMessage);
      setAvailableRequests([]);
      setLoading(false);
    }
  }, [serviceProvider?.service_categories]);

  const fetchMyJobs = useCallback(async () => {
    try {
      if (!serviceProvider?.id) {
        setMyJobs([]);
        return;
      }

      const { data, error } = await supabase
        .from('service_requests')
        .select(`
          *,
          services!inner(name, category),
          profiles!service_requests_client_id_fkey(full_name, email)
        `)
        .eq('service_provider_id', serviceProvider.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      type JobData = ServiceRequest & {
        services?: { name?: string; category?: string };
        profiles?: { full_name?: string; email?: string };
      };
      const transformedJobs: ServiceRequest[] = (data || []).map((job: unknown): ServiceRequest => {
        const j = job as JobData;
        return {
          id: j.id,
          title: j.title,
          description: j.description,
          status: j.status,
          location: j.location,
          created_at: j.created_at,
          services: {
            name: j.services?.name || '',
            category: j.services?.category || ''
          },
          profiles: j.profiles
        };
      });
      
      setMyJobs(transformedJobs);
      setLoading(false);
    } catch (error: unknown) {
      setMyJobs([]);
      setLoading(false);
    }
  }, [serviceProvider?.id]);

  const handleProfileSetupComplete = useCallback(async () => {
    setShowProfileSetup(false);
    await fetchServiceProviderData();
    toast({
      title: 'Profile Updated!',
      description: 'Your changes are now live.',
    });
  }, [fetchServiceProviderData, toast]);

  useEffect(() => {
    if (serviceProvider?.id && serviceProvider?.service_categories && serviceProvider.service_categories.length > 0) {
      setLoading(true);
      fetchAvailableRequests();
      fetchMyJobs();
    }
  }, [serviceProvider?.id, serviceProvider?.service_categories, fetchAvailableRequests, fetchMyJobs]);

  // Real-time subscription for request updates
  useEffect(() => {
    if (!serviceProvider?.id) return;

    const channel = supabase
      .channel('provider-requests-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_requests'
        },
        (payload) => {
          console.log('[ServiceProviderDashboard] Real-time update:', payload);
          // Refresh both available and assigned requests
          fetchAvailableRequests();
          fetchMyJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [serviceProvider?.id, fetchAvailableRequests, fetchMyJobs]);

  const acceptRequest = async (requestId: string) => {
    if (!serviceProvider?.id) return;

    try {
      const { error } = await supabase
        .from('service_requests')
        .update({ 
          service_provider_id: serviceProvider.id,
          status: 'assigned',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Request Accepted! 🎉',
        description: 'You have successfully accepted this service request.',
      });

      fetchAvailableRequests();
      fetchMyJobs();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to accept request';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const handleContactUser = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  const updateJobStatus = async (requestId: string, status: 'assigned' | 'in_progress' | 'completed' | 'cancelled') => {
    try {
      const updateData: { 
        status: 'assigned' | 'in_progress' | 'completed' | 'cancelled'; 
        completed_at?: string;
      } = { status };
      
      // Add completed_at timestamp when marking as complete
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('service_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      // If marking as complete, also increment the provider's total_jobs count
      if (status === 'completed' && serviceProvider?.id) {
        const newTotalJobs = (serviceProvider.total_jobs || 0) + 1;
        await supabase
          .from('service_providers')
          .update({ total_jobs: newTotalJobs })
          .eq('id', serviceProvider.id);
        
        // Update local state immediately
        setServiceProvider(prev => prev ? { ...prev, total_jobs: newTotalJobs } : prev);
      }

      toast({
        title: status === 'completed' ? 'Job Completed! 🎉' : 'Status Updated',
        description: status === 'completed' 
          ? 'Great work! Your completion count has been updated.'
          : `Job status updated to ${status.replace('_', ' ')}`,
      });

      fetchMyJobs();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update status';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  // Check if user needs approval
  if (profile?.approval_status === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
        <Navbar />
        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-md mx-auto border-warning/20 shadow-elegant animate-fade-in">
            <CardHeader className="text-center pb-2">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-warning/20 to-warning/10 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-10 w-10 text-warning" />
              </div>
              <CardTitle className="text-2xl">Pending Approval</CardTitle>
              <CardDescription className="text-base mt-2">
                Your service provider account is being reviewed. We'll notify you once approved.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center pt-4">
              <Button 
                onClick={async () => {
                  await signOut();
                  navigate('/auth', { replace: true });
                }}
                variant="outline"
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (showProfileSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <ProviderProfileSetup onComplete={handleProfileSetupComplete} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Hero Header */}
        <div className="relative mb-8 p-8 rounded-3xl bg-gradient-to-br from-primary via-primary to-primary-glow overflow-hidden animate-fade-in">
          <div className="absolute inset-0 bg-pattern opacity-10" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center overflow-hidden border-2 border-white/20">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-10 w-10 text-primary-foreground" />
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-primary-foreground mb-1">
                  {serviceProvider?.business_name || profile?.full_name || 'Welcome!'}
                </h1>
                <p className="text-primary-foreground/80 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  {serviceProvider?.business_description 
                    ? serviceProvider.business_description.substring(0, 60) + '...' 
                    : 'Manage your business and grow your clientele'}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setShowProfileSetup(true)} variant="secondary" className="shadow-lg">
                <Settings className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
              <Button 
                onClick={async () => {
                  await signOut();
                  navigate('/auth', { replace: true });
                }}
                variant="outline"
                className="bg-white/10 border-white/20 text-primary-foreground hover:bg-white/20"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="group hover:shadow-elegant transition-all duration-300 border-border/50 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <Badge variant="secondary" className="text-xs">Total</Badge>
              </div>
              <p className="text-3xl font-bold">{serviceProvider?.total_jobs || 0}</p>
              <p className="text-sm text-muted-foreground">Jobs Completed</p>
            </CardContent>
          </Card>
          
          <Card className="group hover:shadow-elegant transition-all duration-300 border-border/50 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Star className="h-6 w-6 text-accent" />
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                      key={star} 
                      className={`h-3 w-3 ${star <= (serviceProvider?.rating || 0) ? 'text-accent fill-accent' : 'text-muted'}`} 
                    />
                  ))}
                </div>
              </div>
              <p className="text-3xl font-bold">{serviceProvider?.rating?.toFixed(1) || '0.0'}</p>
              <p className="text-sm text-muted-foreground">Average Rating</p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-elegant transition-all duration-300 border-border/50 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-success/20 to-success/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Briefcase className="h-6 w-6 text-success" />
                </div>
                <Badge variant="outline" className="text-xs">{serviceProvider?.years_experience || 0}+ yrs</Badge>
              </div>
              <p className="text-3xl font-bold">{formatCurrency(serviceProvider?.hourly_rate || 0)}</p>
              <p className="text-sm text-muted-foreground">Hourly Rate</p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-elegant transition-all duration-300 border-border/50 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary/20 to-secondary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Zap className="h-6 w-6 text-secondary" />
                </div>
                <Badge variant="secondary" className="text-xs">Active</Badge>
              </div>
              <p className="text-3xl font-bold">{availableRequests.length}</p>
              <p className="text-sm text-muted-foreground">New Requests</p>
            </CardContent>
          </Card>
        </div>

        {/* Social Links & Portfolio Preview */}
        {(serviceProvider?.facebook_url || serviceProvider?.instagram_url || serviceProvider?.twitter_url || serviceProvider?.whatsapp_number || (serviceProvider?.portfolio_images && serviceProvider.portfolio_images.length > 0)) && (
          <Card className="mb-8 border-border/50 animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <CardContent className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Social Links */}
                {(serviceProvider?.facebook_url || serviceProvider?.instagram_url || serviceProvider?.twitter_url || serviceProvider?.whatsapp_number) && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground">Your Social Links:</span>
                    <div className="flex gap-2">
                      {serviceProvider?.facebook_url && (
                        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => window.open(serviceProvider.facebook_url, '_blank')}>
                          <FacebookIcon className="h-4 w-4 text-blue-600" />
                        </Button>
                      )}
                      {serviceProvider?.instagram_url && (
                        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => window.open(serviceProvider.instagram_url, '_blank')}>
                          <InstagramIcon className="h-4 w-4 text-pink-600" />
                        </Button>
                      )}
                      {serviceProvider?.twitter_url && (
                        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => window.open(serviceProvider.twitter_url, '_blank')}>
                          <TwitterIcon className="h-4 w-4" />
                        </Button>
                      )}
                      {serviceProvider?.whatsapp_number && (
                        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => window.open(`https://wa.me/${serviceProvider.whatsapp_number.replace(/\D/g, '')}`, '_blank')}>
                          <WhatsAppIcon className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Portfolio Preview */}
                {serviceProvider?.portfolio_images && serviceProvider.portfolio_images.length > 0 && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground">Portfolio:</span>
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {serviceProvider.portfolio_images.slice(0, 4).map((img, i) => (
                          <div key={i} className="w-10 h-10 rounded-lg overflow-hidden border-2 border-background">
                            <img src={img} alt={`Work ${i + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                      {serviceProvider.portfolio_images.length > 4 && (
                        <Badge variant="secondary">+{serviceProvider.portfolio_images.length - 4} more</Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="available" className="w-full">
          <TabsList className="mb-6 h-12 p-1 bg-muted/50">
            <TabsTrigger value="available" className="h-10 px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Zap className="h-4 w-4 mr-2" />
              Available Requests
              {availableRequests.length > 0 && (
                <Badge variant="secondary" className="ml-2">{availableRequests.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="my-jobs" className="h-10 px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Briefcase className="h-4 w-4 mr-2" />
              My Jobs
              {myJobs.filter(job => job.status === 'completed').length > 0 && (
                <Badge variant="default" className="ml-2 bg-success text-success-foreground">
                  {myJobs.filter(job => job.status === 'completed').length} Done
                </Badge>
              )}
              {myJobs.filter(job => job.status !== 'completed').length > 0 && (
                <Badge variant="secondary" className="ml-2">{myJobs.filter(job => job.status !== 'completed').length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="space-y-4 animate-fade-in">
            {loading ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
                  <p className="text-muted-foreground">Loading requests...</p>
                </CardContent>
              </Card>
            ) : availableRequests.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="text-center py-16">
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                    <Building2 className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">No Available Requests</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto">New service requests matching your expertise will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {availableRequests.map((request, index) => (
                  <Card 
                    key={request.id} 
                    className="group hover:shadow-elegant transition-all duration-300 border-border/50 overflow-hidden animate-fade-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="h-1 bg-gradient-to-r from-primary to-secondary" />
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg group-hover:text-primary transition-colors">
                            {request.profiles?.full_name 
                              ? `${request.profiles.full_name} needs ${request.services?.name}`
                              : request.title}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="capitalize">{request.services?.category}</Badge>
                            <span className="text-xs">•</span>
                            <span className="text-xs">{new Date(request.created_at).toLocaleDateString()}</span>
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground line-clamp-2">{request.description}</p>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{request.location}</span>
                        </div>
                        {request.profiles?.full_name && (
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>{request.profiles.full_name}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 pt-2">
                        {request.profiles?.email && (
                          <Button 
                            onClick={() => handleContactUser(request.profiles!.email)}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            Contact
                          </Button>
                        )}
                        <Button 
                          onClick={() => acceptRequest(request.id)}
                          size="sm"
                          className="flex-1 bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Accept
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my-jobs" className="space-y-4 animate-fade-in">
            {myJobs.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="text-center py-16">
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                    <Briefcase className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">No Active Jobs</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto">Accept available requests to start working on jobs.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {myJobs.map((job, index) => (
                  <Card 
                    key={job.id} 
                    className="hover:shadow-elegant transition-all duration-300 border-border/50 animate-fade-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-3">
                            {job.title}
                            <Badge variant={
                              job.status === 'completed' ? 'default' : 
                              job.status === 'in_progress' ? 'secondary' : 'outline'
                            } className="capitalize">
                              {job.status.replace('_', ' ')}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <span>{job.services?.name}</span>
                            {job.profiles?.full_name && (
                              <>
                                <span>•</span>
                                <span>Client: {job.profiles.full_name}</span>
                              </>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">{job.description}</p>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{job.location}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(job.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        {job.status === 'assigned' && (
                          <Button 
                            onClick={() => updateJobStatus(job.id, 'in_progress')}
                            size="sm"
                            className="bg-gradient-to-r from-secondary to-accent hover:opacity-90"
                          >
                            <Zap className="h-4 w-4 mr-2" />
                            Start Job
                          </Button>
                        )}
                        {job.status === 'in_progress' && (
                          <Button 
                            onClick={() => updateJobStatus(job.id, 'completed')}
                            size="sm"
                            className="bg-gradient-to-r from-success to-green-600 hover:opacity-90"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Mark Complete
                          </Button>
                        )}
                        {job.profiles?.email && (
                          <Button 
                            onClick={() => handleContactUser(job.profiles!.email)}
                            variant="outline"
                            size="sm"
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            Contact Client
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Danger Zone */}
        <Card className="mt-12 border-destructive/20 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Permanently delete your account. This action cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deletingAccount}>
                  {deletingAccount ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete My Account
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. All your data, jobs, and profile information will be permanently deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      setDeletingAccount(true);
                      try {
                        const { error } = await deleteAccount();
                        if (error) {
                          toast({ title: 'Error', description: error.message, variant: 'destructive' });
                        } else {
                          navigate('/auth', { replace: true });
                        }
                      } finally {
                        setDeletingAccount(false);
                      }
                    }}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Yes, Delete My Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ServiceProviderDashboard;
