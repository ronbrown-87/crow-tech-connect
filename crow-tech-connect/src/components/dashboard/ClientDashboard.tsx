import Navbar from '@/components/Navbar';
import ServiceRequestForm from '@/components/ServiceRequestForm';
import { SubscriptionPayment } from '@/components/SubscriptionPayment';
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
    ArrowRight,
    Award,
    Briefcase,
    Building2,
    Check,
    CheckCircle,
    Clock,
    ExternalLink,
    Loader2,
    LogOut,
    MapPin,
    Plus,
    Search,
    Sparkles,
    Star,
    Trash2,
    TrendingUp,
    User,
    XCircle,
    Zap
} from 'lucide-react';
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  base_price: number;
  duration_estimate: string;
}

interface ServiceRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  completed_at?: string | null;
  services: { name: string };
  service_providers?: {
    id: string;
    business_name: string;
    profiles: { full_name: string };
  };
}

interface SuggestedProvider {
  id: string;
  business_name: string;
  business_description: string;
  rating: number;
  total_jobs: number;
  hourly_rate: number;
  service_categories: string[];
  years_experience: number;
  profiles: {
    full_name: string;
    avatar_url: string;
    location: string;
  };
}

const ClientDashboard = () => {
  const { profile, signOut, deleteAccount } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [myRequests, setMyRequests] = useState<ServiceRequest[]>([]);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [suggestedProviders, setSuggestedProviders] = useState<SuggestedProvider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);

  const fetchServices = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setServices(data || []);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch services';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  }, [toast]);

  const fetchMyRequests = useCallback(async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('service_requests')
        .select(`
          *,
          services!inner(name),
          service_providers(
            id,
            business_name,
            profiles!inner(full_name)
          )
        `)
        .eq('client_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyRequests(data || []);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error fetching requests:', errorMessage);
      toast({
        title: 'Error',
        description: 'Failed to fetch service requests',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [profile?.id, toast]);

  const fetchSuggestedProviders = useCallback(async () => {
    try {
      setLoadingProviders(true);
      
      // Fetch top-rated approved providers
      const { data, error } = await supabase
        .from('service_providers')
        .select(`
          id,
          business_name,
          business_description,
          rating,
          total_jobs,
          hourly_rate,
          service_categories,
          years_experience,
          profiles!inner(
            full_name,
            avatar_url,
            location,
            approval_status
          )
        `)
        .eq('profiles.approval_status', 'approved')
        .order('rating', { ascending: false })
        .limit(6);

      if (error) throw error;
      setSuggestedProviders(data || []);
    } catch (error) {
      console.error('Error fetching suggested providers:', error);
    } finally {
      setLoadingProviders(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
    fetchMyRequests();
    fetchSuggestedProviders();
  }, [fetchServices, fetchMyRequests, fetchSuggestedProviders]);

  // Real-time subscription for request updates
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel('client-requests-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_requests',
          filter: `client_id=eq.${profile.id}`
        },
        (payload) => {
          console.log('[ClientDashboard] Real-time update:', payload);
          fetchMyRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, fetchMyRequests]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'in_progress':
        return 'secondary';
      case 'assigned':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'in_progress':
        return <Clock className="h-4 w-4" />;
      case 'assigned':
        return <Check className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'assigned':
        return 'Accepted';
      case 'in_progress':
        return 'In Progress';
      default:
        return status.replace('_', ' ');
    }
  };

  const markRequestAsFinished = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('service_requests')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .eq('client_id', profile?.id);

      if (error) throw error;

      toast({
        title: 'Request Marked as Finished',
        description: 'Your service request has been marked as completed.',
      });

      fetchMyRequests();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error',
        description: errorMessage || 'Failed to mark request as finished',
        variant: 'destructive'
      });
    }
  };

  const deleteRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to delete this request? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('service_requests')
        .delete()
        .eq('id', requestId)
        .eq('client_id', profile?.id);

      if (error) throw error;

      toast({
        title: 'Request Deleted',
        description: 'Your service request has been deleted successfully.',
      });

      fetchMyRequests();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error',
        description: errorMessage || 'Failed to delete request',
        variant: 'destructive'
      });
    }
  };

  // Check if user needs to pay subscription fee
  if (!profile?.subscription_fee_paid) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <SubscriptionPayment />
          </div>
        </div>
      </div>
    );
  }

  // Check if user needs approval after payment
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
                Your account is pending admin approval. We'll notify you once approved.
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

  if (profile?.approval_status === 'rejected') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
        <Navbar />
        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-md mx-auto border-destructive/20 shadow-elegant animate-fade-in">
            <CardHeader className="text-center pb-2">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-destructive/20 to-destructive/10 flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-10 w-10 text-destructive" />
              </div>
              <CardTitle className="text-2xl">Account Rejected</CardTitle>
              <CardDescription className="text-base mt-2">
                Your account application has been rejected. Please contact support.
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

  const activeRequests = myRequests.filter(r => r.status !== 'completed' && r.status !== 'cancelled').length;
  const completedRequests = myRequests.filter(r => r.status === 'completed').length;

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
                  Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}!
                </h1>
                <p className="text-primary-foreground/80 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Find trusted professionals for your projects
                </p>
              </div>
            </div>
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

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="group hover:shadow-elegant transition-all duration-300 border-border/50 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Briefcase className="h-6 w-6 text-primary" />
                </div>
                <Badge variant="secondary" className="text-xs">Active</Badge>
              </div>
              <p className="text-3xl font-bold">{activeRequests}</p>
              <p className="text-sm text-muted-foreground">Active Requests</p>
            </CardContent>
          </Card>
          
          <Card className="group hover:shadow-elegant transition-all duration-300 border-border/50 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-success/20 to-success/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CheckCircle className="h-6 w-6 text-success" />
                </div>
                <Badge variant="outline" className="text-xs">Done</Badge>
              </div>
              <p className="text-3xl font-bold">{completedRequests}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-elegant transition-all duration-300 border-border/50 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TrendingUp className="h-6 w-6 text-accent" />
                </div>
                <Badge variant="secondary" className="text-xs">Total</Badge>
              </div>
              <p className="text-3xl font-bold">{myRequests.length}</p>
              <p className="text-sm text-muted-foreground">All Requests</p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-elegant transition-all duration-300 border-border/50 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary/20 to-secondary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Zap className="h-6 w-6 text-secondary" />
                </div>
                <Badge variant="outline" className="text-xs">Available</Badge>
              </div>
              <p className="text-3xl font-bold">{services.length}</p>
              <p className="text-sm text-muted-foreground">Services</p>
            </CardContent>
          </Card>
        </div>

        {/* Suggested Providers */}
        {suggestedProviders.length > 0 && (
          <Card className="mb-8 border-border/50 animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center">
                    <Star className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Top-Rated Providers</CardTitle>
                    <CardDescription>Trusted professionals ready to help</CardDescription>
                  </div>
                </div>
                <Button variant="ghost" onClick={() => navigate('/services')} className="gap-2">
                  View All
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {suggestedProviders.map((provider) => (
                  <Card 
                    key={provider.id} 
                    className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-border/50 overflow-hidden"
                    onClick={() => navigate(`/provider/${provider.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {provider.profiles?.avatar_url ? (
                            <img 
                              src={provider.profiles.avatar_url} 
                              alt={provider.business_name || ''} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate group-hover:text-primary transition-colors">
                            {provider.business_name || provider.profiles?.full_name}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1">
                              <Star className="h-3.5 w-3.5 text-accent fill-accent" />
                              <span className="text-sm font-medium">{provider.rating?.toFixed(1) || '0.0'}</span>
                            </div>
                            <span className="text-muted-foreground text-xs">•</span>
                            <span className="text-xs text-muted-foreground">{provider.total_jobs || 0} jobs</span>
                          </div>
                          {provider.profiles?.location && (
                            <div className="flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground truncate">{provider.profiles.location}</span>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {provider.service_categories?.slice(0, 2).map((cat) => (
                              <Badge key={cat} variant="secondary" className="text-xs py-0">
                                {cat.replace('_', ' ')}
                              </Badge>
                            ))}
                            {provider.service_categories?.length > 2 && (
                              <Badge variant="outline" className="text-xs py-0">
                                +{provider.service_categories.length - 2}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t flex items-center justify-between">
                        <span className="text-sm font-semibold text-primary">
                          {formatCurrency(provider.hourly_rate || 0)}/hr
                        </span>
                        <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="services" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="services" className="gap-2">
              <Search className="h-4 w-4" />
              Find Services
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-2">
              <Briefcase className="h-4 w-4" />
              My Requests
            </TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
                <Card key={service.id} className="group hover:shadow-elegant transition-all duration-300 border-border/50 overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{service.name}</CardTitle>
                        <Badge variant="outline" className="capitalize mt-1">
                          {service.category.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CardDescription className="line-clamp-2">{service.description}</CardDescription>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Starting from</span>
                      <span className="font-semibold text-primary">{formatCurrency(service.base_price)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Duration</span>
                      <span>{service.duration_estimate}</span>
                    </div>
                    <Button 
                      className="w-full mt-2 group-hover:bg-primary/90"
                      onClick={() => {
                        setSelectedService(service);
                        setShowRequestForm(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Request Service
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="requests" className="space-y-6">
            {myRequests.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Service Requests Yet</h3>
                  <p className="text-muted-foreground mb-4">Start by requesting a service from our available options.</p>
                  <Button onClick={() => document.querySelector('[value="services"]')?.dispatchEvent(new MouseEvent('click'))}>
                    <Search className="h-4 w-4 mr-2" />
                    Browse Services
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {myRequests.map((request) => (
                  <Card key={request.id} className="hover:shadow-md transition-shadow border-border/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            request.status === 'completed' 
                              ? 'bg-success/10 text-success' 
                              : request.status === 'cancelled'
                              ? 'bg-destructive/10 text-destructive'
                              : 'bg-primary/10 text-primary'
                          }`}>
                            {getStatusIcon(request.status)}
                          </div>
                          <div>
                            <CardTitle className="text-lg">{request.title}</CardTitle>
                            <CardDescription>
                              Service: {request.services?.name}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant={getStatusBadgeVariant(request.status)} className="capitalize">
                          {getStatusLabel(request.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {request.description}
                      </p>
                      
                      <div className="flex flex-wrap gap-4 text-sm">
                        {request.service_providers && (
                          <div 
                            className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
                            onClick={() => navigate(`/provider/${request.service_providers?.id}`)}
                          >
                            <Award className="h-4 w-4 text-muted-foreground" />
                            <span>{request.service_providers?.business_name || request.service_providers?.profiles?.full_name}</span>
                            <ExternalLink className="h-3 w-3" />
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{new Date(request.created_at).toLocaleDateString()}</span>
                        </div>
                        {request.status === 'completed' && request.completed_at && (
                          <div className="flex items-center gap-2 text-success">
                            <CheckCircle className="h-4 w-4" />
                            <span>Completed {new Date(request.completed_at).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 pt-2 border-t">
                        {request.status !== 'completed' && request.status !== 'cancelled' && (
                          <Button
                            onClick={() => markRequestAsFinished(request.id)}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                          >
                            <Check className="h-4 w-4" />
                            Mark as Finished
                          </Button>
                        )}
                        {(request.status === 'pending' || request.status === 'cancelled') && (
                          <Button
                            onClick={() => deleteRequest(request.id)}
                            variant="destructive"
                            size="sm"
                            className="gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
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

        {showRequestForm && selectedService && (
          <ServiceRequestForm
            service={selectedService}
            onClose={() => {
              setShowRequestForm(false);
              setSelectedService(null);
            }}
            onSuccess={() => {
              setShowRequestForm(false);
              setSelectedService(null);
              fetchMyRequests();
            }}
          />
        )}

        {/* Account Deletion Section */}
        <Card className="mt-8 border-destructive/20">
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
                <Button 
                  variant="destructive" 
                  disabled={deletingAccount}
                  className="w-full sm:w-auto"
                >
                  {deletingAccount ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting Account...
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
                    This action cannot be undone. This will permanently delete your account
                    and remove all associated data from our servers. All your service requests,
                    profile information, and data will be permanently deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deletingAccount}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      setDeletingAccount(true);
                      try {
                        const { error } = await deleteAccount();
                        if (error) {
                          toast({
                            title: 'Error',
                            description: error.message || 'Failed to delete account',
                            variant: 'destructive'
                          });
                          setDeletingAccount(false);
                        } else {
                          toast({
                            title: 'Account Deleted',
                            description: 'Your account has been permanently deleted.',
                          });
                          navigate('/auth', { replace: true });
                        }
                      } catch (error: unknown) {
                        const errorMessage = error instanceof Error ? error.message : 'Failed to delete account';
                        toast({
                          title: 'Error',
                          description: errorMessage,
                          variant: 'destructive'
                        });
                        setDeletingAccount(false);
                      }
                    }}
                    disabled={deletingAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deletingAccount ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Yes, Delete My Account'
                    )}
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

export default ClientDashboard;
