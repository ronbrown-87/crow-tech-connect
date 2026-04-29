import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Briefcase, Search, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-28 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-glow to-primary" />
      
      {/* Animated orbs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-secondary/10 blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-secondary/5 blur-3xl animate-float" style={{ animationDelay: '3s' }} />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: 'linear-gradient(hsl(var(--secondary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--secondary)) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm mb-8">
            <Sparkles className="h-4 w-4 text-secondary" />
            <span className="text-sm font-medium text-white/80">Get started in minutes</span>
          </div>
          
          <h2 className="text-4xl md:text-6xl font-display font-bold mb-6 text-white leading-tight">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-white/60 mb-14 max-w-xl mx-auto">
            Whether you're looking for services or want to grow your business, CrowTech is your gateway.
          </p>

          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="group bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10 hover:border-secondary/30 hover:bg-white/10 transition-all duration-500">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary/20 to-secondary/10 flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-300">
                <Search className="h-8 w-8 text-secondary" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Find Services</h3>
              <p className="text-white/50 mb-6 text-sm leading-relaxed">
                Browse verified professionals and get your project done right.
              </p>
              <Button 
                size="lg"
                className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-xl shadow-glow"
                onClick={() => navigate('/services')}
              >
                Browse Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            <div className="group bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10 hover:border-secondary/30 hover:bg-white/10 transition-all duration-500">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-300">
                <Briefcase className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Offer Services</h3>
              <p className="text-white/50 mb-6 text-sm leading-relaxed">
                Join as a provider, get discovered, and grow your business.
              </p>
              <Button 
                size="lg"
                className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl"
                onClick={() => navigate('/auth')}
              >
                Join Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
