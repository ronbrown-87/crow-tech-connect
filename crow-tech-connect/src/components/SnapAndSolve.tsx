import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import {
  Camera,
  Upload,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Star,
  MapPin,
  User,
  Phone,
  X,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type ServiceCategory = Database['public']['Enums']['service_category'];

interface Diagnosis {
  problem: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: ServiceCategory;
  recommendation: string;
  confidence: number;
}

interface MatchedProvider {
  id: string;
  business_name: string | null;
  business_description: string | null;
  rating: number | null;
  total_jobs: number | null;
  years_experience: number | null;
  whatsapp_number: string | null;
  contact_phone: string | null;
  profiles?: { full_name: string | null; location: string | null; avatar_url: string | null } | null;
}

type Stage = 'capture' | 'scanning' | 'result' | 'error';

const severityStyles: Record<Diagnosis['severity'], { label: string; className: string; icon: React.ElementType }> = {
  low: { label: 'Low severity', className: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30', icon: CheckCircle2 },
  medium: { label: 'Medium severity', className: 'bg-amber-500/15 text-amber-700 border-amber-500/30', icon: AlertTriangle },
  high: { label: 'High severity', className: 'bg-orange-500/15 text-orange-700 border-orange-500/30', icon: AlertTriangle },
  critical: { label: 'Critical — act now', className: 'bg-destructive/15 text-destructive border-destructive/30', icon: AlertTriangle },
};

interface SnapAndSolveProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SnapAndSolve: React.FC<SnapAndSolveProps> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>('capture');
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [typingText, setTypingText] = useState('');
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [providers, setProviders] = useState<MatchedProvider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reset everything when modal closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => reset(), 200);
    }
  }, [open]);

  // Drive the scanning bar animation while we wait for the AI
  useEffect(() => {
    if (stage !== 'scanning') return;
    setScanProgress(0);
    const id = setInterval(() => {
      setScanProgress((p) => (p >= 95 ? 95 : p + 1.5));
    }, 60);
    return () => clearInterval(id);
  }, [stage]);

  // Empathetic typing message during scan
  useEffect(() => {
    if (stage !== 'scanning') {
      setTypingText('');
      return;
    }
    const phrases = [
      'Looking at your photo…',
      'Identifying the issue…',
      'Checking severity…',
      'Finding the right specialists for you…',
    ];
    let i = 0;
    setTypingText(phrases[0]);
    const id = setInterval(() => {
      i = (i + 1) % phrases.length;
      setTypingText(phrases[i]);
    }, 1600);
    return () => clearInterval(id);
  }, [stage]);

  const reset = () => {
    setStage('capture');
    setImageDataUrl(null);
    setDiagnosis(null);
    setProviders([]);
    setErrorMsg(null);
    setScanProgress(0);
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please upload an image', variant: 'destructive' });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: 'Image too large', description: 'Please use an image under 8MB.', variant: 'destructive' });
      return;
    }

    // Read as data URL for preview
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    setImageDataUrl(dataUrl);
    setStage('scanning');
    await analyze(dataUrl, file.type);
  };

  const analyze = async (dataUrl: string, mimeType: string) => {
    try {
      const base64 = dataUrl.split(',')[1];
      const { data, error } = await supabase.functions.invoke('diagnose-issue', {
        body: { imageBase64: base64, mimeType },
      });

      if (error || !data?.diagnosis) {
        throw new Error(error?.message || data?.error || 'Could not analyze the photo');
      }

      const dx = data.diagnosis as Diagnosis;
      setDiagnosis(dx);
      setScanProgress(100);
      // Brief pause so the "100%" feels real
      setTimeout(() => setStage('result'), 400);
      void fetchProviders(dx.category);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Analysis failed';
      setErrorMsg(msg);
      setStage('error');
    }
  };

  const fetchProviders = async (category: ServiceCategory) => {
    setLoadingProviders(true);
    try {
      const { data, error } = await supabase
        .from('service_providers')
        .select(`
          id, business_name, business_description, rating, total_jobs,
          years_experience, whatsapp_number, contact_phone,
          profiles(full_name, location, avatar_url)
        `)
        .contains('service_categories', [category])
        .order('rating', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Provider fetch error:', error);
        setProviders([]);
      } else {
        setProviders((data as unknown as MatchedProvider[]) || []);
      }
    } finally {
      setLoadingProviders(false);
    }
  };

  const triggerUpload = () => fileInputRef.current?.click();
  const triggerCamera = () => cameraInputRef.current?.click();

  const sevStyle = diagnosis ? severityStyles[diagnosis.severity] : null;
  const SevIcon = sevStyle?.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="bg-gradient-to-r from-primary via-primary to-accent px-5 py-4 flex-shrink-0">
          <DialogTitle className="text-primary-foreground flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5" />
            Snap & Solve with Misozi
          </DialogTitle>
          <p className="text-primary-foreground/80 text-xs mt-1">
            Snap a photo of your problem — I'll identify it and find specialists nearby.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* CAPTURE STAGE */}
          {stage === 'capture' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={triggerCamera}
                  className="group relative rounded-2xl border-2 border-dashed border-border hover:border-primary p-5 sm:p-6 flex flex-col items-center gap-2 transition-all hover:bg-muted/40 active:scale-[0.98]"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    <Camera className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <span className="font-semibold text-sm">Take photo</span>
                  <span className="text-xs text-muted-foreground">Use your camera</span>
                </button>
                <button
                  onClick={triggerUpload}
                  className="group relative rounded-2xl border-2 border-dashed border-border hover:border-primary p-5 sm:p-6 flex flex-col items-center gap-2 transition-all hover:bg-muted/40 active:scale-[0.98]"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary to-primary flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    <Upload className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <span className="font-semibold text-sm">Upload photo</span>
                  <span className="text-xs text-muted-foreground">From your device</span>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />

              <div className="rounded-xl bg-muted/40 border border-border p-3 text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Tip:</strong> Get close to the issue, make sure
                it's well-lit, and capture the broken or damaged part clearly.
              </div>
            </div>
          )}

          {/* SCANNING STAGE */}
          {stage === 'scanning' && imageDataUrl && (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden border border-border bg-black aspect-video">
                <img src={imageDataUrl} alt="Scanning" className="w-full h-full object-contain" />
                {/* Horizontal scanning light bar */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div
                    className="absolute left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_20px_4px_rgba(34,211,238,0.7)]"
                    style={{ animation: 'misozi-scan 1.8s ease-in-out infinite' }}
                  />
                  <div className="absolute inset-0 bg-cyan-400/5" />
                </div>
                <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/60 text-cyan-300 text-[10px] font-mono tracking-wider">
                  AI ANALYSIS · {Math.round(scanProgress)}%
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary via-accent to-primary transition-all duration-200"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>

              {/* Typing indicator */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="italic">{typingText}</span>
              </div>

              <style>{`@keyframes misozi-scan { 0% { top: 0%; } 50% { top: 100%; } 100% { top: 0%; } }`}</style>
            </div>
          )}

          {/* RESULT STAGE */}
          {stage === 'result' && diagnosis && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
              {/* Image thumbnail + diagnosis */}
              <Card className="overflow-hidden border-primary/20">
                <div className="flex flex-col sm:flex-row">
                  {imageDataUrl && (
                    <img
                      src={imageDataUrl}
                      alt="Diagnosed issue"
                      className="w-full sm:w-40 h-40 sm:h-auto object-cover"
                    />
                  )}
                  <CardContent className="flex-1 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <h3 className="text-lg font-bold leading-tight">{diagnosis.problem}</h3>
                      {sevStyle && SevIcon && (
                        <Badge variant="outline" className={`${sevStyle.className} gap-1`}>
                          <SevIcon className="h-3 w-3" />
                          {sevStyle.label}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      <span className="text-primary font-semibold">Misozi:</span> {diagnosis.recommendation}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="capitalize">Category: <strong className="text-foreground">{diagnosis.category}</strong></span>
                      <span>·</span>
                      <span>Confidence: {Math.round(diagnosis.confidence * 100)}%</span>
                    </div>
                  </CardContent>
                </div>
              </Card>

              {/* Providers */}
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Verified specialists for {diagnosis.category}
                </h4>

                {loadingProviders ? (
                  <div className="flex items-center justify-center py-6 text-muted-foreground text-sm gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Finding specialists nearby…
                  </div>
                ) : providers.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                    No verified providers in this category yet.{' '}
                    <button onClick={() => navigate('/services')} className="text-primary underline">
                      Browse all services
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {providers.map((p) => (
                      <Card key={p.id} className="border-border hover:border-primary/40 transition-colors">
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {p.profiles?.avatar_url ? (
                              <img src={p.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User className="h-5 w-5 text-primary-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">
                              {p.business_name || p.profiles?.full_name || 'Service Provider'}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <span className="flex items-center gap-0.5">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                {(p.rating || 0).toFixed(1)}
                              </span>
                              {p.profiles?.location && (
                                <span className="flex items-center gap-0.5 truncate">
                                  <MapPin className="h-3 w-3" />
                                  {p.profiles.location}
                                </span>
                              )}
                              {p.years_experience ? <span>· {p.years_experience}+ yrs</span> : null}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              onOpenChange(false);
                              navigate(`/provider/${p.id}`);
                            }}
                            className="flex-shrink-0"
                          >
                            Hire Now
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" onClick={reset} className="flex-1 gap-2">
                  <RotateCcw className="h-4 w-4" /> Scan another
                </Button>
                <Button
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/services?category=${diagnosis.category}`);
                  }}
                  className="flex-1"
                >
                  See all {diagnosis.category}
                </Button>
              </div>
            </div>
          )}

          {/* ERROR STAGE */}
          {stage === 'error' && (
            <div className="space-y-4 text-center py-6">
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <X className="h-7 w-7 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold">I couldn't analyze that photo</h3>
                <p className="text-sm text-muted-foreground mt-1">{errorMsg || 'Please try again with a clearer image.'}</p>
              </div>
              <Button onClick={reset} className="gap-2">
                <RotateCcw className="h-4 w-4" /> Try again
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SnapAndSolve;