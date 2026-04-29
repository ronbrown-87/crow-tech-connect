import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, X, Star, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NearbyProvider {
  id: string;
  business_name: string | null;
  service_categories: string[];
  rating: number | null;
  latitude: number | null;
  longitude: number | null;
  profiles?: {
    full_name: string | null;
    location: string | null;
  };
}

interface ProximityNotificationsProps {
  providers: NearbyProvider[];
  userPosition: [number, number] | null;
}

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const ProximityNotifications: React.FC<ProximityNotificationsProps> = ({ providers, userPosition }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NearbyProvider[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const shownRef = useRef(new Set<string>());

  useEffect(() => {
    if (!userPosition || providers.length === 0) return;

    const nearby = providers
      .filter(p => {
        if (!p.latitude || !p.longitude) return false;
        if (dismissed.has(p.id) || shownRef.current.has(p.id)) return false;
        const dist = getDistanceKm(userPosition[0], userPosition[1], p.latitude, p.longitude);
        return dist <= 2; // Within 2km
      })
      .slice(0, 3); // Max 3 notifications at a time

    if (nearby.length > 0) {
      nearby.forEach(p => shownRef.current.add(p.id));
      setNotifications(prev => [...prev, ...nearby]);
    }
  }, [providers, userPosition, dismissed]);

  const dismiss = (id: string) => {
    setDismissed(prev => new Set(prev).add(id));
    setNotifications(prev => prev.filter(p => p.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-[60] flex flex-col gap-2 max-w-sm">
      {notifications.map((provider) => {
        const dist = userPosition && provider.latitude && provider.longitude
          ? getDistanceKm(userPosition[0], userPosition[1], provider.latitude, provider.longitude)
          : null;

        return (
          <div
            key={provider.id}
            className="bg-card border border-border rounded-xl shadow-lg p-3 animate-slide-in-right flex items-start gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {provider.business_name || provider.profiles?.full_name || 'Provider'} nearby!
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                {provider.rating && (
                  <span className="flex items-center gap-0.5">
                    <Star className="h-3 w-3 text-accent fill-accent" />
                    {provider.rating.toFixed(1)}
                  </span>
                )}
                {dist !== null && (
                  <span>📍 {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`} away</span>
                )}
              </div>
              <div className="flex gap-1 mt-1">
                {provider.service_categories?.slice(0, 2).map(cat => (
                  <span key={cat} className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary/10 text-secondary capitalize">
                    {cat}
                  </span>
                ))}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs text-primary mt-1 p-0 hover:bg-transparent"
                onClick={() => {
                  navigate(`/provider/${provider.id}`);
                  dismiss(provider.id);
                }}
              >
                View Profile <ChevronRight className="h-3 w-3 ml-0.5" />
              </Button>
            </div>
            <button
              onClick={() => dismiss(provider.id)}
              className="w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center flex-shrink-0"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ProximityNotifications;
