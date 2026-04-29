import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Droplets, Zap, Hammer, Paintbrush, Wrench, Scissors, Car, Truck, Bike, Globe, Smartphone, Palette, PenTool, Megaphone, Share2, Video, Trees, Camera, Clapperboard, Users, Sparkles, Music, BookOpen, GraduationCap, Dumbbell, Heart, Lightbulb, PartyPopper, UtensilsCrossed, Mic2, Volume2, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ServiceCategory {
  id: string;
  name: string;
  icon: React.ElementType;
  services: { name: string; slug: string }[];
}

const serviceCategories: ServiceCategory[] = [
  {
    id: 'home-services',
    name: 'Home & Construction',
    icon: Wrench,
    services: [
      { name: 'Plumber', slug: 'plumbing' },
      { name: 'Electrician', slug: 'electrical' },
      { name: 'Carpenter', slug: 'carpentry' },
      { name: 'Painter', slug: 'painting' },
      { name: 'Cleaner / Housekeeping', slug: 'maintenance' },
      { name: 'Handyman', slug: 'maintenance' },
    ]
  },
  {
    id: 'automotive',
    name: 'Automotive',
    icon: Car,
    services: [
      { name: 'Mechanic', slug: 'automotive' },
      { name: 'Car Wash & Detailing', slug: 'automotive' },
      { name: 'Towing Service', slug: 'automotive' },
      { name: 'Motorcycle Repair', slug: 'automotive' },
      { name: 'Mobile Tire Service', slug: 'automotive' },
    ]
  },
  {
    id: 'tech',
    name: 'Tech & Digital',
    icon: Globe,
    services: [
      { name: 'Web Developer', slug: 'tech' },
      { name: 'Mobile App Developer', slug: 'tech' },
      { name: 'UI/UX Designer', slug: 'tech' },
      { name: 'Graphic Designer', slug: 'tech' },
      { name: 'Digital Marketer', slug: 'tech' },
      { name: 'Social Media Manager', slug: 'tech' },
    ]
  },
  {
    id: 'creative',
    name: 'Creative & Media',
    icon: Camera,
    services: [
      { name: 'Photographer', slug: 'creative' },
      { name: 'Videographer', slug: 'creative' },
      { name: 'Video Editor', slug: 'creative' },
      { name: 'Content Creator', slug: 'creative' },
      { name: 'Event Coverage', slug: 'creative' },
      { name: 'Animator', slug: 'creative' },
      { name: 'Music Producer / DJ', slug: 'creative' },
    ]
  },
  {
    id: 'outdoor',
    name: 'Outdoor & Landscaping',
    icon: Trees,
    services: [
      { name: 'Gardener / Landscaping', slug: 'landscaping' },
    ]
  },
  {
    id: 'education',
    name: 'Education & Coaching',
    icon: BookOpen,
    services: [
      { name: 'Tutors (Math, Science, Languages)', slug: 'education' },
      { name: 'Exam Prep Coaches', slug: 'education' },
      { name: 'Fitness Trainers', slug: 'education' },
      { name: 'Life Coaches', slug: 'education' },
      { name: 'Music Teachers', slug: 'education' },
    ]
  },
  {
    id: 'events',
    name: 'Events & Entertainment',
    icon: PartyPopper,
    services: [
      { name: 'Event Planner', slug: 'events' },
      { name: 'Caterer', slug: 'events' },
      { name: 'Decorator', slug: 'events' },
      { name: 'MC / Host', slug: 'events' },
      { name: 'Sound & Lighting', slug: 'events' },
    ]
  },
];

const categoryIcons: Record<string, React.ElementType> = {
  'plumbing': Droplets,
  'electrical': Zap,
  'carpentry': Hammer,
  'painting': Paintbrush,
  'cleaning': Scissors,
  'handyman': Wrench,
  'mechanic': Car,
  'car-wash': Car,
  'towing': Truck,
  'motorcycle-repair': Bike,
  'tire-service': Car,
  'web-development': Globe,
  'app-development': Smartphone,
  'ui-ux': Palette,
  'graphic-design': PenTool,
  'digital-marketing': Megaphone,
  'social-media': Share2,
  'photography': Camera,
  'videography': Clapperboard,
  'video-editing': Video,
  'content-creation': Users,
  'event-coverage': Camera,
  'animation': Sparkles,
  'music-production': Music,
  'landscaping': Trees,
  'tutoring': GraduationCap,
  'exam-prep': BookOpen,
  'fitness': Dumbbell,
  'life-coaching': Heart,
  'music-teaching': Music,
  'event-planning': PartyPopper,
  'catering': UtensilsCrossed,
  'decoration': Sparkles,
  'mc-host': Mic2,
  'sound-lighting': Volume2,
};

const categoryColors: Record<string, string> = {
  'home-services': 'from-primary to-primary-glow',
  'automotive': 'from-slate-700 to-slate-600',
  'tech': 'from-blue-600 to-blue-500',
  'creative': 'from-purple-600 to-purple-500',
  'outdoor': 'from-green-600 to-green-500',
  'education': 'from-amber-600 to-amber-500',
  'events': 'from-secondary to-accent',
};

const ServicesPreview = () => {
  const navigate = useNavigate();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-secondary/10 text-secondary font-semibold text-sm mb-4">
            Our Services
          </span>
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-6 text-primary">
            Find Expert <span className="text-secondary">Professionals</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            From home repairs to digital services, we connect you with qualified professionals across Zambia.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {serviceCategories.map((category, index) => {
            const CategoryIcon = category.icon;
            const isExpanded = expandedCategory === category.id;
            const gradient = categoryColors[category.id] || 'from-primary to-secondary';
            
            return (
              <Card 
                key={category.id}
                className="group cursor-pointer border-border hover:border-secondary/50 transition-all duration-300 hover:shadow-elegant overflow-hidden"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <CardContent className="p-0">
                  {/* Category Header */}
                  <div 
                    onClick={() => toggleCategory(category.id)}
                    className={`p-6 bg-gradient-to-br ${gradient} text-white relative overflow-hidden`}
                  >
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                          <CategoryIcon className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{category.name}</h3>
                          <p className="text-white/80 text-sm">{category.services.length} services</p>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Services List */}
                  <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                    <div className="p-4 space-y-2 bg-card">
                      {category.services.map((service) => {
                        const ServiceIcon = categoryIcons[service.slug] || Wrench;
                        return (
                          <button
                            key={service.slug}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/services?category=${service.slug}`);
                            }}
                            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left group/item"
                          >
                            <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                              <ServiceIcon className="h-4 w-4 text-secondary" />
                            </div>
                            <span className="flex-1 text-sm font-medium text-foreground group-hover/item:text-secondary transition-colors">
                              {service.name}
                            </span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover/item:text-secondary group-hover/item:translate-x-1 transition-all" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <Button 
            size="lg"
            onClick={() => navigate('/services')}
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-elegant hover:shadow-glow transition-all duration-300"
          >
            View All Services
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ServicesPreview;
