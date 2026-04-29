import React from 'react';
import { Target, Heart, Globe, Users, ArrowRight } from 'lucide-react';

const MissionSection = () => {
  const values = [
    {
      icon: Target,
      title: 'Our Mission',
      description: 'Bridge the gap between skilled professionals and those who need their expertise, building trust in every connection.',
      color: 'from-primary to-primary-glow',
    },
    {
      icon: Heart,
      title: 'Our Vision',
      description: 'A Zambia where quality craftsmanship is accessible to all and skilled workers thrive in their communities.',
      color: 'from-secondary to-accent',
    },
    {
      icon: Globe,
      title: 'Community First',
      description: 'Empowering local talent by connecting communities with trusted professionals, strengthening economies.',
      color: 'from-success to-success',
    },
    {
      icon: Users,
      title: 'For Everyone',
      description: 'Whether you need repairs or offer services, CrowTech is your platform for growth and opportunity.',
      color: 'from-accent to-secondary',
    },
  ];

  return (
    <section className="py-28 bg-card relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/3 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/3 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="inline-block px-4 py-2 rounded-full bg-primary/5 border border-primary/10 text-primary font-semibold text-sm mb-6">
            About Us
          </span>
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-6 text-foreground">
            Why <span className="text-secondary">CrowTech</span>?
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            More than a platform — a community transforming how Zambia connects with skilled professionals.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {values.map((value, index) => (
            <div 
              key={value.title}
              className="group relative p-8 rounded-2xl bg-background border border-border/50 hover:border-secondary/30 transition-all duration-500 hover:shadow-elegant overflow-hidden"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Hover gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/0 to-secondary/0 group-hover:from-secondary/3 group-hover:to-transparent transition-all duration-500" />
              
              <div className="relative flex items-start gap-5">
                <div className={`flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br ${value.color} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                  <value.icon className="h-7 w-7 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 group-hover:text-secondary transition-colors duration-300">
                    {value.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {value.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MissionSection;
