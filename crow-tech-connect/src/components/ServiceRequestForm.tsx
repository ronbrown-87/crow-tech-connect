import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Star, MapPin, User, Eye, Check } from 'lucide-react';
import { serviceRequestSchema, ServiceRequestData } from '@/lib/validations';
import { formatCurrency } from '@/lib/currency';
import { z } from 'zod';

interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  base_price: number;
}

interface MatchingProvider {
  id: string;
  business_name: string;
  rating: number;
  total_jobs: number;
  hourly_rate: number;
  profiles: {
    full_name: string;
    avatar_url: string;
    location: string;
  };
}

interface ServiceRequestFormProps {
  service: Service;
  onClose: () => void;
  onSuccess: () => void;
}

const ServiceRequestForm = ({ service, onClose, onSuccess }: ServiceRequestFormProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [matchingProviders, setMatchingProviders] = useState<MatchingProvider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ServiceRequestData>({
    title: '',
    description: '',
    location: '',
    preferredDate: '',
    budgetRange: ''
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ServiceRequestData, string>>>({});

  useEffect(() => {
    fetchMatchingProviders();
  }, [service.category]);

  const fetchMatchingProviders = async () => {
    try {
      const { data, error } = await supabase
        .from('service_providers')
        .select(`
          id,
          business_name,
          rating,
          total_jobs,
          hourly_rate,
          service_categories,
          profiles!inner(full_name, avatar_url, location, approval_status)
        `)
        .contains('service_categories', [service.category])
        .eq('profiles.approval_status', 'approved')
        .order('rating', { ascending: false })
        .limit(5);

      if (error) throw error;
      setMatchingProviders(data || []);
    } catch (error) {
      console.error('Error fetching providers:', error);
    } finally {
      setLoadingProviders(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate input
    try {
      serviceRequestSchema.parse(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<Record<keyof ServiceRequestData, string>> = {};
        error.issues.forEach((issue) => {
          if (issue.path[0]) {
            fieldErrors[issue.path[0] as keyof ServiceRequestData] = issue.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }
    }

    setLoading(true);

    try {
      // If a provider is selected, the request is directly assigned to them
      const { error } = await supabase
        .from('service_requests')
        .insert({
          client_id: profile?.id,
          service_id: service.id,
          title: formData.title.trim(),
          description: formData.description.trim(),
          location: formData.location.trim(),
          preferred_date: formData.preferredDate || null,
          budget_range: formData.budgetRange?.trim() || null,
          service_provider_id: selectedProviderId || null,
          status: selectedProviderId ? 'assigned' : 'pending'
        });

      if (error) throw error;

      toast({
        title: selectedProviderId ? 'Request Sent to Provider' : 'Request Submitted',
        description: selectedProviderId 
          ? 'Your request has been sent directly to the selected provider.'
          : 'Your service request has been submitted successfully. Matching service providers will be notified.',
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit request',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const viewProviderProfile = (providerId: string) => {
    navigate(`/provider/${providerId}`);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request {service.name}</DialogTitle>
          <DialogDescription>
            Fill out the form below to request this service.
          </DialogDescription>
        </DialogHeader>

        {/* Matching Providers Section */}
        {!loadingProviders && matchingProviders.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-2">Select a Provider (Optional)</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Choose a specific provider or leave unselected to broadcast to all matching providers.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {matchingProviders.map((provider) => (
                <Card 
                  key={provider.id} 
                  className={`cursor-pointer transition-all ${
                    selectedProviderId === provider.id 
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5' 
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedProviderId(
                    selectedProviderId === provider.id ? null : provider.id
                  )}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ${
                      selectedProviderId === provider.id 
                        ? 'ring-2 ring-primary' 
                        : ''
                    }`}>
                      {provider.profiles?.avatar_url ? (
                        <img 
                          src={provider.profiles.avatar_url} 
                          alt={provider.business_name || ''} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                          <User className="h-6 w-6 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {provider.business_name || provider.profiles?.full_name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-accent fill-accent" />
                          <span>{provider.rating?.toFixed(1) || '0.0'}</span>
                        </div>
                        {provider.profiles?.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{provider.profiles.location}</span>
                          </div>
                        )}
                      </div>
                      {provider.hourly_rate && (
                        <p className="text-xs text-primary font-medium">
                          From {formatCurrency(provider.hourly_rate)}/hr
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      {selectedProviderId === provider.id ? (
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-4 w-4 text-primary-foreground" />
                        </div>
                      ) : (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            viewProviderProfile(provider.id);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {selectedProviderId && (
              <p className="text-xs text-primary mt-2 flex items-center gap-1">
                <Check className="h-3 w-3" />
                Request will be sent directly to selected provider
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Request Title</Label>
            <Input
              id="title"
              placeholder="Brief title for your request"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={errors.title ? 'border-destructive' : ''}
              required
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your requirements in detail"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={errors.description ? 'border-destructive' : ''}
              required
              rows={4}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="Where should the service be provided?"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className={errors.location ? 'border-destructive' : ''}
              required
            />
            {errors.location && (
              <p className="text-sm text-destructive">{errors.location}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferred-date">Preferred Date (Optional)</Label>
            <Input
              id="preferred-date"
              type="datetime-local"
              value={formData.preferredDate}
              onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
              className={errors.preferredDate ? 'border-destructive' : ''}
            />
            {errors.preferredDate && (
              <p className="text-sm text-destructive">{errors.preferredDate}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget">Budget Range in ZMW (Optional)</Label>
            <Input
              id="budget"
              placeholder="e.g., ZMW 500 - ZMW 1,000"
              value={formData.budgetRange}
              onChange={(e) => setFormData({ ...formData, budgetRange: e.target.value })}
              className={errors.budgetRange ? 'border-destructive' : ''}
            />
            {errors.budgetRange && (
              <p className="text-sm text-destructive">{errors.budgetRange}</p>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Submit Request
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceRequestForm;