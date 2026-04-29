import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Hammer, Wrench, Zap, Car, Shield, Clock, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Navy Blue Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary-glow" />
      
      {/* Animated gradient orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-secondary/10 blur-3xl animate-float" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-secondary/5 blur-3xl animate-float" style={{ animationDelay: '3s' }} />
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(hsl(var(--secondary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--secondary)) 1px, transparent 1px)',
        backgroundSize: '60px 60px'
      }} />

      {/* Floating Icons */}
      <div className="absolute top-24 left-[10%] animate-float opacity-20">
        <div className="w-14 h-14 rounded-2xl bg-secondary/20 backdrop-blur-sm flex items-center justify-center border border-secondary/10">
          <Hammer className="h-7 w-7 text-secondary" />
        </div>
      </div>
      <div className="absolute top-40 right-[15%] animate-float opacity-20" style={{ animationDelay: '1s' }}>
        <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
          <Wrench className="h-6 w-6 text-white" />
        </div>
      </div>
      <div className="absolute bottom-40 left-[20%] animate-float opacity-20" style={{ animationDelay: '2s' }}>
        <div className="w-12 h-12 rounded-2xl bg-secondary/20 backdrop-blur-sm flex items-center justify-center border border-secondary/10">
          <Zap className="h-6 w-6 text-secondary" />
        </div>
      </div>
      <div className="absolute bottom-32 right-[25%] animate-float opacity-20" style={{ animationDelay: '0.5s' }}>
        <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
          <Car className="h-5 w-5 text-white" />
        </div>
      </div>

      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-slide-up">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-sm font-semibold text-white tracking-wide">Zambia's Premier Service Platform</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold leading-[0.9] text-white">
            Building Dreams,
            <span className="block text-gradient mt-2" style={{
              background: 'linear-gradient(135deg, hsl(var(--secondary)), hsl(var(--accent)))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>One Service at a Time</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed">
            Connect with verified professionals across Zambia. 
            From construction to tech — find expertise you can trust.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <Button 
              size="lg" 
              className="text-lg px-8 py-6 shadow-glow hover:shadow-[0_0_60px_hsl(var(--secondary)/0.5)] transition-all duration-500 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-xl"
              onClick={() => navigate('/services')}
            >
              Explore Services
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 py-6 border-white/20 text-white hover:bg-white/10 transition-all duration-300 rounded-xl backdrop-blur-sm"
              onClick={() => navigate('/auth')}
            >
              Join as Provider
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="grid grid-cols-3 gap-6 pt-16 max-w-xl mx-auto">
            <div className="text-center group">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 group-hover:border-secondary/30 transition-colors">
                <Shield className="h-5 w-5 text-secondary" />
              </div>
              <div className="text-2xl md:text-3xl font-bold text-white">Verified</div>
              <div className="text-xs text-white/50 mt-1">Professionals</div>
            </div>
            <div className="text-center group">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 group-hover:border-secondary/30 transition-colors">
                <Clock className="h-5 w-5 text-secondary" />
              </div>
              <div className="text-2xl md:text-3xl font-bold text-white">Fast</div>
              <div className="text-xs text-white/50 mt-1">Response Time</div>
            </div>
            <div className="text-center group">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 group-hover:border-secondary/30 transition-colors">
                <Star className="h-5 w-5 text-secondary" />
              </div>
              <div className="text-2xl md:text-3xl font-bold text-white">5-Star</div>
              <div className="text-xs text-white/50 mt-1">Quality Service</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default HeroSection;
