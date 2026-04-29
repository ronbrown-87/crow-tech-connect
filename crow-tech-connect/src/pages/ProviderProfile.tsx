import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Star, 
  MapPin, 
  Briefcase, 
  Phone, 
  Mail,
  User,
  Calendar,
  Award,
  MessageCircle
} from 'lucide-react';
import { FacebookIcon, InstagramIcon, TwitterIcon } from '@/components/icons/SocialIcons';
import Footer from '@/components/landing/Footer';
import PhotoLightbox from '@/components/PhotoLightbox';
import { formatCurrency } from '@/lib/currency';

interface ProviderDetails {
  id: string;
  business_name: string;
  business_description: string;
  service_categories: string[];
  hourly_rate: number;
  rating: number;
  total_jobs: number;
  years_experience: number;
  certifications: string[];
  portfolio_images: string[];
  portfolio_captions: Record<string, string>;
  facebook_url: string;
  instagram_url: string;
  twitter_url: string;
  whatsapp_number: string;
  contact_email: string;
  contact_phone: string;
  profiles: {
    full_name: string;
    location: string;
    avatar_url: string;
    phone: string;
    email: string;
  };
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url: string;
  };
}

const ProviderProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [provider, setProvider] = useState<ProviderDetails | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [userProfile, setUserProfile] = useState<{ id: string } | null>(null);

  useEffect(() => {
    if (id) {
      fetchProvider();
      fetchReviews();
    }
  }, [id]);

  // Fetch user profile for reviews
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) {
        setUserProfile(null);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      setUserProfile(data);
    };
    fetchUserProfile();
  }, [user]);

  const fetchProvider = async () => {
    const { data, error } = await supabase
      .from('service_providers')
      .select(`
        *,
        profiles!inner(full_name, location, avatar_url, phone, email, approval_status)
      `)
      .eq('id', id)
      .eq('profiles.approval_status', 'approved')
      .maybeSingle();
    
    if (error) {
      console.error('[ProviderProfile] Error fetching provider:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load provider profile',
        variant: 'destructive'
      });
      setLoading(false);
      return;
    }
    
    if (data) {
      setProvider({
        ...data,
        portfolio_captions: (data.portfolio_captions as Record<string, string>) || {}
      });
    } else {
      toast({
        title: 'Provider Not Found',
        description: 'This service provider profile does not exist or is not approved.',
        variant: 'destructive'
      });
    }
    setLoading(false);
  };

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          profiles(full_name, avatar_url)
        `)
        .eq('service_provider_id', id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching reviews:', error);
        setReviews([]);
      } else {
        setReviews(data || []);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setReviews([]);
    }
  };

  const handleRating = async (rating: number) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to leave a review",
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }

    setUserRating(rating);
  };

  const submitReview = async () => {
    if (!user || !userProfile || userRating === 0 || !id) return;
    
    setSubmittingReview(true);
    
    try {
      // First check if user has any completed service request with this provider
      const { data: serviceRequests, error: srError } = await supabase
        .from('service_requests')
        .select('id')
        .eq('client_id', userProfile.id)
        .eq('service_provider_id', id)
        .eq('status', 'completed')
        .limit(1);

      if (srError) {
        throw srError;
      }

      // If no completed service with this provider, we'll create a "general" review
      // For now, we'll show a note that proper reviews require a completed service
      if (!serviceRequests || serviceRequests.length === 0) {
        toast({
          title: "Review Noted",
          description: "For a full review, you'll need to complete a service with this provider first. Your rating has been recorded.",
        });
        // Update provider's rating average (simplified)
        const newAvgRating = reviews.length > 0 
          ? ((provider?.rating || 0) * reviews.length + userRating) / (reviews.length + 1)
          : userRating;
        
        await supabase
          .from('service_providers')
          .update({ rating: newAvgRating })
          .eq('id', id);
        
        // Refresh provider data
        fetchProvider();
        setUserRating(0);
        setUserComment('');
        setSubmittingReview(false);
        return;
      }

      // Insert the review
      const { error: reviewError } = await supabase
        .from('reviews')
        .insert({
          client_id: userProfile.id,
          service_provider_id: id,
          service_request_id: serviceRequests[0].id,
          rating: userRating,
          comment: userComment || null,
        });

      if (reviewError) {
        throw reviewError;
      }

      // Update provider's average rating
      const newAvgRating = reviews.length > 0 
        ? ((provider?.rating || 0) * reviews.length + userRating) / (reviews.length + 1)
        : userRating;
      
      await supabase
        .from('service_providers')
        .update({ 
          rating: newAvgRating,
          total_jobs: (provider?.total_jobs || 0) + 1 
        })
        .eq('id', id);

      toast({
        title: "Review Submitted! ⭐",
        description: "Thank you for your feedback.",
      });
      
      // Refresh data
      fetchReviews();
      fetchProvider();
      setUserRating(0);
      setUserComment('');
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit review",
        variant: "destructive"
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Provider not found</h2>
          <Button onClick={() => navigate('/services')}>Back to Services</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="relative mb-8">
          <div className="h-48 rounded-2xl bg-gradient-to-br from-primary via-secondary to-primary opacity-90" />
          
          <div className="absolute -bottom-16 left-8 flex items-end gap-6">
            <div className="w-32 h-32 rounded-2xl bg-card border-4 border-background overflow-hidden shadow-elegant">
              {provider.profiles?.avatar_url ? (
                <img 
                  src={provider.profiles.avatar_url} 
                  alt={provider.business_name || ''} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <User className="h-16 w-16 text-primary-foreground" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-20 grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardContent className="p-6">
                <h1 className="text-3xl font-display font-bold mb-2">
                  {provider.business_name || provider.profiles?.full_name}
                </h1>
                
                <div className="flex flex-wrap items-center gap-4 text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 text-accent fill-accent" />
                    <span className="font-semibold text-foreground">{provider.rating?.toFixed(1) || '0.0'}</span>
                    <span>({reviews.length} reviews)</span>
                  </div>
                  
                  {provider.profiles?.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{provider.profiles.location}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1">
                    <Briefcase className="h-4 w-4" />
                    <span>{provider.total_jobs || 0} jobs completed</span>
                  </div>
                </div>

                {/* Categories */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {provider.service_categories?.map((cat) => (
                    <span 
                      key={cat}
                      className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium"
                    >
                      {cat.replace('_', ' ')}
                    </span>
                  ))}
                </div>

                {/* Bio */}
                <div>
                  <h3 className="font-semibold mb-2">About</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {provider.business_description || 'Professional service provider ready to help with your projects.'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Experience & Certifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  Experience & Certifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <span>{provider.years_experience || 0}+ years of experience</span>
                </div>
                
                {provider.certifications && provider.certifications.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Certifications:</h4>
                    <div className="flex flex-wrap gap-2">
                      {provider.certifications.map((cert, i) => (
                        <span 
                          key={i}
                          className="px-3 py-1 rounded-full bg-success/10 text-success text-sm"
                        >
                          {cert}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Portfolio */}
            {provider.portfolio_images && provider.portfolio_images.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Portfolio</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {provider.portfolio_images.map((img, i) => (
                      <div 
                        key={i} 
                        className="rounded-xl overflow-hidden border cursor-pointer"
                        onClick={() => {
                          setLightboxIndex(i);
                          setLightboxOpen(true);
                        }}
                      >
                        <div className="aspect-square">
                          <img 
                            src={img} 
                            alt={`Work ${i + 1}`}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        {provider.portfolio_captions?.[img] && (
                          <div className="p-3 bg-muted/50">
                            <p className="text-sm text-muted-foreground">
                              {provider.portfolio_captions[img]}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Photo Lightbox */}
            <PhotoLightbox
              images={provider.portfolio_images || []}
              captions={provider.portfolio_captions}
              currentIndex={lightboxIndex}
              isOpen={lightboxOpen}
              onClose={() => setLightboxOpen(false)}
              onNavigate={setLightboxIndex}
            />

            {/* Reviews */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  Reviews
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Leave a Review */}
                <div className="mb-6 p-4 bg-muted/50 rounded-xl">
                  <h4 className="font-medium mb-3">Rate this provider</h4>
                  <div className="flex items-center gap-2 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => handleRating(star)}
                        className="focus:outline-none hover:scale-110 transition-transform"
                      >
                        <Star 
                          className={`h-8 w-8 transition-colors cursor-pointer ${
                            star <= userRating 
                              ? 'text-accent fill-accent' 
                              : 'text-muted-foreground hover:text-accent/50'
                          }`} 
                        />
                      </button>
                    ))}
                    {userRating > 0 && (
                      <span className="ml-2 text-sm text-muted-foreground">
                        {userRating} star{userRating > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {userRating > 0 && (
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Share your experience with this provider (optional)..."
                        value={userComment}
                        onChange={(e) => setUserComment(e.target.value)}
                        rows={3}
                        className="resize-none"
                      />
                      <Button 
                        onClick={submitReview} 
                        disabled={submittingReview}
                        className="gap-2"
                      >
                        {submittingReview ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Star className="h-4 w-4" />
                            Submit Review
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  {!user && (
                    <p className="text-sm text-muted-foreground mt-2">
                      <button 
                        onClick={() => navigate('/auth')} 
                        className="text-primary hover:underline"
                      >
                        Sign in
                      </button>
                      {' '}to leave a review.
                    </p>
                  )}
                </div>

                {/* Review List */}
                {reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="border-b border-border pb-4 last:border-0">
                        <div className="flex items-start gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            {review.profiles?.avatar_url ? (
                              <img 
                                src={review.profiles.avatar_url} 
                                alt={review.profiles.full_name || 'User'} 
                                className="w-full h-full object-cover rounded-full"
                              />
                            ) : (
                              <User className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">
                                {review.profiles?.full_name || 'Anonymous'}
                              </span>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star 
                                    key={star}
                                    className={`h-3 w-3 ${
                                      star <= (review.rating || 0)
                                        ? 'text-accent fill-accent' 
                                        : 'text-muted-foreground'
                                    }`} 
                                  />
                                ))}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(review.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            {review.comment && (
                              <p className="text-sm text-muted-foreground">{review.comment}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No reviews yet. Be the first to rate!
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Contact */}
          <div className="space-y-6">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(provider.contact_phone || provider.profiles?.phone) && (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-3"
                    onClick={() => window.open(`tel:${provider.contact_phone || provider.profiles?.phone}`, '_self')}
                  >
                    <Phone className="h-5 w-5 text-primary" />
                    {provider.contact_phone || provider.profiles?.phone}
                  </Button>
                )}
                
                {(provider.contact_email || provider.profiles?.email) && (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-3"
                    onClick={() => window.open(`mailto:${provider.contact_email || provider.profiles?.email}`, '_self')}
                  >
                    <Mail className="h-5 w-5 text-primary" />
                    <span className="truncate">{provider.contact_email || provider.profiles?.email}</span>
                  </Button>
                )}

                {provider.whatsapp_number && (
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => window.open(`https://wa.me/${provider.whatsapp_number.replace(/\D/g, '')}`, '_blank')}
                  >
                    WhatsApp
                  </Button>
                )}

                {/* Social Links */}
                {(provider.facebook_url || provider.instagram_url || provider.twitter_url) && (
                  <div className="pt-4 border-t border-border">
                    <h4 className="text-sm font-medium mb-3">Social Media</h4>
                    <div className="flex gap-3">
                      {provider.facebook_url && (
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => window.open(provider.facebook_url, '_blank')}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <FacebookIcon className="h-5 w-5" />
                        </Button>
                      )}
                      {provider.instagram_url && (
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => window.open(provider.instagram_url, '_blank')}
                          className="text-pink-600 hover:text-pink-700"
                        >
                          <InstagramIcon className="h-5 w-5" />
                        </Button>
                      )}
                      {provider.twitter_url && (
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => window.open(provider.twitter_url, '_blank')}
                        >
                          <TwitterIcon className="h-5 w-5" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {provider.hourly_rate && (
                  <div className="pt-4 border-t border-border">
                    <div className="text-center">
                      <span className="text-sm text-muted-foreground">Starting from</span>
                      <div className="text-2xl font-bold text-primary">
                        {formatCurrency(provider.hourly_rate)}/hr
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProviderProfile;
