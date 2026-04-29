import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Star, MapPin, Loader2, LocateFixed, Phone, MessageCircle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const createProviderIcon = (category: string) => {
  const colors: Record<string, string> = {
    plumbing: '#3B82F6', electrical: '#F59E0B', carpentry: '#D97706',
    painting: '#EC4899', roofing: '#475569', construction: '#8B5CF6',
    landscaping: '#16A34A', automotive: '#EF4444', tech: '#6366F1',
    creative: '#F472B6', events: '#A855F7', maintenance: '#10B981',
    default: '#6B7280',
  };
  const color = colors[category] || colors.default;

  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="position: relative; width: 40px; height: 40px;">
      <div style="
        position: absolute; inset: 0;
        border-radius: 50%;
        background: ${color}40;
        animation: pulse-ring 2s ease-out infinite;
      "></div>
      <div style="
        position: absolute; top: 4px; left: 4px;
        width: 32px; height: 32px; border-radius: 50%;
        background: linear-gradient(135deg, ${color}, ${color}CC);
        border: 3px solid white;
        box-shadow: 0 2px 12px rgba(0,0,0,0.35);
        display: flex; align-items: center; justify-content: center;
      ">
        <div style="width: 10px; height: 10px; border-radius: 50%; background: #22C55E; border: 2px solid white; box-shadow: 0 0 6px #22C55E;"></div>
      </div>
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

const createUserIcon = () => {
  return L.divIcon({
    className: 'user-marker',
    html: `<div style="
      width: 20px; height: 20px; border-radius: 50%;
      background: #3B82F6; border: 3px solid white;
      box-shadow: 0 0 0 3px rgba(59,130,246,0.3), 0 2px 8px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

interface Provider {
  id: string;
  business_name: string | null;
  business_description: string | null;
  service_categories: string[];
  rating: number | null;
  total_jobs: number | null;
  latitude: number | null;
  longitude: number | null;
  hourly_rate: number | null;
  whatsapp_number: string | null;
  contact_phone: string | null;
  profiles?: {
    full_name: string | null;
    location: string | null;
    avatar_url: string | null;
  };
}

interface ProvidersMapProps {
  categoryFilter?: string;
  onNearbyProviders?: (providers: Provider[]) => void;
}

const DEFAULT_CENTER: [number, number] = [-15.4167, 28.2833];
const DEFAULT_ZOOM = 12;

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const FlyToLocation = ({ position }: { position: [number, number] | null }) => {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, 14, { duration: 1.5 });
    }
  }, [position, map]);
  return null;
};

const FitBounds = ({ providers, userPos }: { providers: Provider[]; userPos: [number, number] | null }) => {
  const map = useMap();
  useEffect(() => {
    const points: [number, number][] = providers.filter(p => p.latitude && p.longitude).map(p => [p.latitude!, p.longitude!]);
    if (userPos) points.push(userPos);
    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom: 14 });
    }
  }, [providers, userPos, map]);
  return null;
};

const ProvidersMap: React.FC<ProvidersMapProps> = ({ categoryFilter, onNearbyProviders }) => {
  const navigate = useNavigate();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(categoryFilter || '');
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  const categories = [
    'plumbing', 'electrical', 'carpentry', 'painting', 'roofing',
    'construction', 'landscaping', 'automotive', 'tech', 'creative',
    'events', 'maintenance', 'tiling', 'surveying', 'outdoor', 'education',
  ];

  // Auto-detect location on mount
  useEffect(() => {
    requestLocation();
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [selectedCategory]);

  // Notify parent of nearby providers when user location or providers change
  useEffect(() => {
    if (userPosition && providers.length > 0 && onNearbyProviders) {
      const nearby = providers.filter(p => {
        if (!p.latitude || !p.longitude) return false;
        return getDistanceKm(userPosition[0], userPosition[1], p.latitude, p.longitude) <= 5;
      });
      onNearbyProviders(nearby);
    }
  }, [userPosition, providers, onNearbyProviders]);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported');
      return;
    }
    setLocating(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPosition([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false);
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        setLocationError('Location access denied');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('service_providers')
        .select(`
          id, business_name, business_description, service_categories,
          rating, total_jobs, latitude, longitude, hourly_rate,
          whatsapp_number, contact_phone,
          profiles(full_name, location, avatar_url)
        `)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (selectedCategory) {
        query = query.contains('service_categories', [selectedCategory]);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching map providers:', error);
        setProviders([]);
      } else {
        setProviders(data || []);
      }
    } catch (err) {
      console.error('Map fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const providersWithCoords = providers.filter(p => p.latitude && p.longitude);

  // Sort by distance from user
  const sortedProviders = userPosition
    ? [...providersWithCoords].sort((a, b) => {
        const distA = getDistanceKm(userPosition[0], userPosition[1], a.latitude!, a.longitude!);
        const distB = getDistanceKm(userPosition[0], userPosition[1], b.latitude!, b.longitude!);
        return distA - distB;
      })
    : providersWithCoords;

  return (
    <div className="relative w-full h-[360px] sm:h-[500px] rounded-xl overflow-hidden border border-border">
      {/* Category filter */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setSelectedCategory('')}
          className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap font-medium transition-all shadow-sm ${
            !selectedCategory
              ? 'bg-primary text-primary-foreground'
              : 'bg-card/90 backdrop-blur-sm text-foreground hover:bg-card border border-border'
          }`}
        >
          All
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat === selectedCategory ? '' : cat)}
            className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap font-medium transition-all shadow-sm capitalize ${
              selectedCategory === cat
                ? 'bg-primary text-primary-foreground'
                : 'bg-card/90 backdrop-blur-sm text-foreground hover:bg-card border border-border'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading && (
        <div className="absolute inset-0 z-[999] bg-background/50 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Locate me button */}
      <button
        onClick={requestLocation}
        disabled={locating}
        className="absolute top-14 right-3 z-[1000] w-10 h-10 rounded-lg bg-card/90 backdrop-blur-sm border border-border shadow-sm flex items-center justify-center hover:bg-card transition-colors"
        title="Find my location"
      >
        {locating ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : (
          <LocateFixed className={`h-4 w-4 ${userPosition ? 'text-primary' : 'text-muted-foreground'}`} />
        )}
      </button>

      <MapContainer
        center={userPosition || DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="w-full h-full"
        style={{ zIndex: 0 }}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution=""
        />
        <FlyToLocation position={userPosition} />
        {!userPosition && <FitBounds providers={sortedProviders} userPos={null} />}

        {/* User location marker + radius */}
        {userPosition && (
          <>
            <Marker position={userPosition} icon={createUserIcon()}>
              <Popup>
                <div className="text-center p-1">
                  <p className="font-bold text-sm">📍 Your Location</p>
                  <p className="text-xs text-gray-500">Providers within 5km shown</p>
                </div>
              </Popup>
            </Marker>
            <Circle
              center={userPosition}
              radius={5000}
              pathOptions={{ color: '#3B82F6', fillColor: '#3B82F6', fillOpacity: 0.05, weight: 1 }}
            />
          </>
        )}

        {sortedProviders.map(provider => (
          <Marker
            key={provider.id}
            position={[provider.latitude!, provider.longitude!]}
            icon={createProviderIcon(provider.service_categories?.[0] || 'default')}
          >
            <Popup>
              <div className="min-w-[220px] p-2">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-lg font-bold text-primary border-2 border-primary/30">
                    {(provider.business_name || provider.profiles?.full_name || 'P').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm leading-tight">
                      {provider.business_name || provider.profiles?.full_name || 'Provider'}
                    </h4>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                      <span>{provider.rating?.toFixed(1) || '0.0'}</span>
                      <span>•</span>
                      <span>{provider.total_jobs || 0} jobs</span>
                    </div>
                  </div>
                </div>
                {userPosition && provider.latitude && provider.longitude && (
                  <div className="flex items-center gap-1 text-xs text-primary mb-1">
                    <MapPin className="h-3 w-3" />
                    {getDistanceKm(userPosition[0], userPosition[1], provider.latitude, provider.longitude).toFixed(1)} km away
                  </div>
                )}
                {provider.profiles?.location && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                    <MapPin className="h-3 w-3" />
                    {provider.profiles.location}
                  </div>
                )}
                <div className="flex flex-wrap gap-1 mb-3">
                  {provider.service_categories?.slice(0, 3).map(cat => (
                    <span key={cat} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary capitalize font-medium">
                      {cat}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs h-8 gap-1"
                    onClick={() => navigate(`/provider/${provider.id}`)}
                  >
                    <Eye className="h-3 w-3" />
                    View Profile
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 text-xs h-8 gap-1"
                    onClick={() => {
                      if (provider.whatsapp_number) {
                        window.open(`https://wa.me/${provider.whatsapp_number.replace(/\D/g, '')}`, '_blank');
                      } else if (provider.contact_phone) {
                        window.open(`tel:${provider.contact_phone}`, '_self');
                      } else {
                        navigate(`/provider/${provider.id}`);
                      }
                    }}
                  >
                    <Phone className="h-3 w-3" />
                    Contact Now
                  </Button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Info badges */}
      <div className="absolute bottom-3 left-3 right-3 z-[1000] flex items-center justify-between">
        <div className="bg-card/90 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-medium shadow-sm border border-border">
          <MapPin className="h-3 w-3 inline mr-1" />
          {providersWithCoords.length} provider{providersWithCoords.length !== 1 ? 's' : ''} on map
        </div>
        {locationError && (
          <div className="bg-destructive/10 text-destructive rounded-full px-3 py-1.5 text-xs font-medium border border-destructive/20">
            {locationError}
          </div>
        )}
        {userPosition && !locationError && (
          <div className="bg-primary/10 text-primary rounded-full px-3 py-1.5 text-xs font-medium border border-primary/20">
            📍 Location active
          </div>
        )}
      </div>
    </div>
  );
};

export default ProvidersMap;
