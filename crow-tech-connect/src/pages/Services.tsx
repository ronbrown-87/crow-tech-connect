import React, { useEffect, useState, useCallback, Suspense, lazy } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, 
  Search, 
  Star, 
  MapPin, 
  Briefcase,
  Droplets, 
  Zap, 
  Hammer as HammerIcon, 
  Paintbrush, 
  Home, 
  Wrench,
  TreePine,
  Lightbulb,
  User,
  Loader2,
  Navigation,
  X
} from 'lucide-react';
import Footer from '@/components/landing/Footer';
import ProximityNotifications from '@/components/ProximityNotifications';
import SnapAndSolve from '@/components/SnapAndSolve';
import { Sparkles, Camera } from 'lucide-react';

// Lazy-load the heavy Leaflet map bundle so it doesn't block initial paint on mobile
const ProvidersMap = lazy(() => import('@/components/ProvidersMap'));

const iconMap: Record<string, React.ElementType> = {
  plumbing: Droplets,
  electrical: Zap,
  carpentry: HammerIcon,
  painting: Paintbrush,
  roofing: Home,
  general_maintenance: Wrench,
  landscaping: TreePine,
  hvac: Lightbulb,
};

const colorMap: Record<string, string> = {
  plumbing: 'from-blue-500 to-blue-600',
  electrical: 'from-yellow-500 to-orange-500',
  carpentry: 'from-amber-600 to-amber-700',
  painting: 'from-pink-500 to-rose-500',
  roofing: 'from-slate-600 to-slate-700',
  general_maintenance: 'from-green-500 to-emerald-600',
  landscaping: 'from-green-600 to-green-700',
  hvac: 'from-cyan-500 to-blue-500',
};

interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  providerCount?: number;
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
  profile_id: string;
  portfolio_images: string[];
  profiles?: {
    full_name: string;
    location: string;
    avatar_url: string;
  };
}

const Services = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedCategory = searchParams.get('category');
  
  const [services, setServices] = useState<Service[]>([]);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [nearbyProviders, setNearbyProviders] = useState<any[]>([]);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [snapOpen, setSnapOpen] = useState(false);

  // Get user location for proximity notifications
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserPosition([pos.coords.latitude, pos.coords.longitude]),
        () => {},
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  const handleNearbyProviders = useCallback((providers: any[]) => {
    setNearbyProviders(providers);
  }, []);

  useEffect(() => {
    fetchServices();
    // If there's a category in URL, fetch providers
    if (selectedCategory) {
      fetchProviders(selectedCategory);
    }
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchProviders(selectedCategory);
    }
  }, [selectedCategory]);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) {
        console.error('Error fetching services:', error);
        setServices([]);
        return;
      }
      
      // First fetch ALL approved providers (RLS policy handles approval filtering)
      const { data: allProviders, error: providerError } = await supabase
        .from('service_providers')
        .select('id, service_categories');
      
      if (providerError) {
        console.error('Error fetching provider counts:', providerError);
        // Still show services, just without counts
        setServices((data || []).map(s => ({ ...s, providerCount: 0 })));
        return;
      }
      
      // Count providers for each service category locally
      const servicesWithCounts = (data || []).map((service) => {
        const count = (allProviders || []).filter(
          p => p.service_categories?.includes(service.category)
        ).length;
        return { ...service, providerCount: count };
      });
      
      setServices(servicesWithCounts);
    } catch (error) {
      console.error('Error fetching services:', error);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProviders = async (category: string) => {
    setProvidersLoading(true);
    setProviders([]); // Clear previous providers while loading
    try {
      // RLS policy "Approved service providers are publicly viewable" already filters to approved
      // So we just need to filter by category
      const { data, error } = await supabase
        .from('service_providers')
        .select(`
          id,
          business_name,
          business_description,
          service_categories,
          hourly_rate,
          rating,
          total_jobs,
          years_experience,
          profile_id,
          portfolio_images,
          profiles(full_name, location, avatar_url)
        `)
        .contains('service_categories', [category as Database['public']['Enums']['service_category']]);
      
      if (error) {
        console.error('Error fetching providers:', error);
        setProviders([]);
      } else {
        // Filter client-side to ensure only those with the category are shown
        const filtered = (data || []).filter(
          p => p.service_categories?.includes(category as Database['public']['Enums']['service_category'])
        );
        console.log(`Found ${filtered.length} providers for category: ${category}`, filtered);
        setProviders(filtered);
      }
    } catch (error) {
      console.error('Error fetching providers:', error);
      setProviders([]);
    } finally {
      setProvidersLoading(false);
    }
  };

  const filteredServices = services.filter(service => 
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCategoryClick = (category: string) => {
    setSearchParams({ category });
  };

  const clearCategory = () => {
    setSearchParams({});
    setProviders([]);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Proximity Notifications */}
      <ProximityNotifications providers={nearbyProviders} userPosition={userPosition} />
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
            <Button 
              variant="ghost" 
              onClick={() => selectedCategory ? clearCategory() : navigate('/')}
              className="gap-1 sm:gap-2 px-2 sm:px-3 text-sm"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden xs:inline">{selectedCategory ? 'All Services' : 'Home'}</span>
              <span className="xs:hidden">{selectedCategory ? 'Back' : 'Home'}</span>
            </Button>
            
            <h1 className="text-sm sm:text-xl font-display font-bold truncate text-center flex-1">
              {selectedCategory ? `${selectedCategory.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Providers` : 'Services'}
            </h1>
            
            <div className="w-12 sm:w-20" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {!selectedCategory ? (
          <>
            {/* Snap & Solve hero CTA */}
            <div className="mb-4 sm:mb-6 flex justify-center">
              <button
                onClick={() => setSnapOpen(true)}
                className="group relative w-full sm:w-auto max-w-xl overflow-hidden rounded-3xl px-5 sm:px-8 py-4 sm:py-5 bg-gradient-to-br from-secondary via-accent to-primary shadow-glow hover:shadow-elegant transition-all duration-500 hover:scale-[1.01] active:scale-[0.99]"
              >
                {/* Decorative shimmer */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary-foreground)/0.25),transparent_60%)] opacity-80 group-hover:opacity-100 transition-opacity" />
                <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-primary-foreground/10 blur-2xl group-hover:scale-125 transition-transform duration-700" />
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary-foreground/40 to-transparent" />

                <div className="relative flex items-center gap-3 sm:gap-4">
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary-foreground/15 backdrop-blur-sm flex items-center justify-center ring-2 ring-primary-foreground/30 group-hover:ring-primary-foreground/60 transition-all">
                      <Camera className="h-6 w-6 sm:h-7 sm:w-7 text-primary-foreground" />
                    </div>
                    <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-primary-foreground animate-pulse" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] sm:text-xs uppercase tracking-widest text-primary-foreground/80 font-semibold">
                        Powered by Misozi AI
                      </span>
                    </div>
                    <h3 className="text-primary-foreground font-display font-bold text-lg sm:text-2xl leading-tight">
                      Scan Issue
                    </h3>
                    <p className="text-primary-foreground/80 text-xs sm:text-sm leading-snug truncate">
                      Snap a photo · get instant diagnosis · meet the right specialist
                    </p>
                  </div>
                  <div className="hidden sm:flex flex-shrink-0 px-3 py-1.5 rounded-full bg-primary-foreground/15 backdrop-blur-sm text-primary-foreground text-xs font-semibold ring-1 ring-primary-foreground/30 group-hover:bg-primary-foreground/25 transition-colors">
                    Try now →
                  </div>
                </div>
              </button>
            </div>

            {/* Find Nearby Providers Button */}
            <div className="mb-6 sm:mb-8 flex justify-center">
              <button
                onClick={() => setShowMap(!showMap)}
                className="group relative overflow-hidden rounded-2xl px-5 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-primary via-primary/90 to-accent shadow-elegant hover:shadow-xl transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto max-w-md"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-accent/20 via-transparent to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative flex items-center justify-center gap-2 sm:gap-3">
                  {showMap ? (
                    <X className="h-5 w-5 text-primary-foreground" />
                  ) : (
                    <div className="relative">
                      <Navigation className="h-5 w-5 text-primary-foreground" />
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse border border-primary-foreground/30" />
                    </div>
                  )}
                  <span className="text-primary-foreground font-semibold text-sm sm:text-base">
                    {showMap ? 'Hide Map' : 'Find Nearby Providers'}
                  </span>
                  {!showMap && (
                    <MapPin className="h-4 w-4 text-primary-foreground/70 group-hover:translate-y-[-2px] transition-transform duration-300" />
                  )}
                </div>
              </button>
            </div>

            {/* Map (toggled) */}
            {showMap && (
              <div className="mb-6 sm:mb-8 animate-in slide-in-from-top-4 duration-500">
                <Suspense fallback={
                  <div className="w-full h-[360px] sm:h-[500px] rounded-xl border border-border bg-muted/30 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                }>
                  <ProvidersMap onNearbyProviders={handleNearbyProviders} />
                </Suspense>
              </div>
            )}

            {/* Search */}
            <div className="max-w-xl mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 text-lg"
                />
              </div>
            </div>

            {/* Services Grid */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground">Loading services...</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredServices.map((service) => {
                const Icon = iconMap[service.category] || Wrench;
                const gradient = colorMap[service.category] || 'from-primary to-secondary';
                
                return (
                  <Card 
                    key={service.id}
                    className="group cursor-pointer border-border hover:border-primary/30 transition-all duration-300 hover:shadow-elegant overflow-hidden"
                    onClick={() => handleCategoryClick(service.category)}
                  >
                    <CardContent className="p-6">
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                        <Icon className="h-7 w-7 text-white" />
                      </div>
                      <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                        {service.name}
                      </h3>
                      <p className="text-muted-foreground text-sm mb-2">
                        {service.description}
                      </p>
                      {service.providerCount !== undefined && (
                        <p className="text-xs text-primary font-medium">
                          {service.providerCount} {service.providerCount === 1 ? 'provider' : 'providers'} available
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              </div>
            )}

            {filteredServices.length === 0 && !loading && (
              <div className="text-center py-16">
                <p className="text-muted-foreground text-lg">No services found</p>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Providers List */}
            {providersLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground">Loading providers...</p>
              </div>
            ) : providers.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {providers.map((provider) => (
                  <Card 
                    key={provider.id}
                    className="group cursor-pointer border-border hover:border-primary/30 transition-all duration-300 hover:shadow-elegant overflow-hidden"
                    onClick={() => navigate(`/provider/${provider.id}`)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {provider.profiles?.avatar_url ? (
                            <img 
                              src={provider.profiles.avatar_url} 
                              alt={provider.business_name || ''} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="h-8 w-8 text-primary-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold truncate group-hover:text-primary transition-colors">
                            {provider.business_name || provider.profiles?.full_name || 'Service Provider'}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Star className="h-4 w-4 text-accent fill-accent" />
                            <span>{provider.rating?.toFixed(1) || '0.0'}</span>
                            <span>•</span>
                            <span>{provider.total_jobs || 0} jobs</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-muted-foreground text-sm mt-4 line-clamp-2">
                        {provider.business_description || 'Professional service provider'}
                      </p>

                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                        {provider.profiles?.location && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span className="truncate">{provider.profiles.location}</span>
                          </div>
                        )}
                        {provider.years_experience && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Briefcase className="h-4 w-4" />
                            <span>{provider.years_experience}+ yrs</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <User className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">No Providers Yet</h3>
                <p className="text-muted-foreground mb-6">
                  Be the first to offer this service!
                </p>
                <Button onClick={() => navigate('/auth')}>
                  Join as Provider
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
      <SnapAndSolve open={snapOpen} onOpenChange={setSnapOpen} />
    </div>
  );
};

export default Services;
