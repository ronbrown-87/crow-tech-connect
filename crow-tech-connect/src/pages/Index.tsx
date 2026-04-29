import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LogIn, User, Menu, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import HeroSection from '@/components/landing/HeroSection';
import MissionSection from '@/components/landing/MissionSection';
import ServicesPreview from '@/components/landing/ServicesPreview';
import CTASection from '@/components/landing/CTASection';
import Footer from '@/components/landing/Footer';
import crowLogo from '@/assets/crow-logo.png';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (action: () => void) => {
    setMobileMenuOpen(false);
    action();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
              <img src={crowLogo} alt="CrowTech" className="w-10 h-10 rounded-lg object-contain" />
              <span className="text-xl font-display font-bold">CrowTech</span>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-6">
              <button 
                onClick={() => navigate('/')}
                className="text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                Home
              </button>
              <button 
                onClick={() => {
                  document.getElementById('mission')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                About
              </button>
              <button 
                onClick={() => navigate('/services')}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Services
              </button>
            </div>

            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <Button 
                  onClick={() => navigate('/dashboard')}
                  className="shadow-elegant"
                >
                  <User className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              ) : (
                <>
                  <Button 
                    variant="ghost"
                    onClick={() => navigate('/auth')}
                  >
                    Sign In
                  </Button>
                  <Button 
                    onClick={() => navigate('/auth')}
                    className="shadow-elegant"
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    Get Started
                  </Button>
                </>
              )}
            </div>

            {/* Mobile Hamburger Menu */}
            <div className="md:hidden">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] p-0">
                  <div className="flex flex-col h-full">
                    {/* Mobile Menu Header */}
                    <div className="flex items-center gap-2 p-4 border-b">
                      <img src={crowLogo} alt="CrowTech" className="w-8 h-8 rounded-lg object-contain" />
                      <span className="text-lg font-display font-bold">CrowTech</span>
                    </div>
                    
                    {/* Mobile Navigation Links */}
                    <div className="flex flex-col p-4 gap-2">
                      <button 
                        onClick={() => handleNavClick(() => navigate('/'))}
                        className="text-left py-3 px-4 rounded-lg hover:bg-muted transition-colors font-medium"
                      >
                        Home
                      </button>
                      <button 
                        onClick={() => handleNavClick(() => {
                          document.getElementById('mission')?.scrollIntoView({ behavior: 'smooth' });
                        })}
                        className="text-left py-3 px-4 rounded-lg hover:bg-muted transition-colors"
                      >
                        About
                      </button>
                      <button 
                        onClick={() => handleNavClick(() => navigate('/services'))}
                        className="text-left py-3 px-4 rounded-lg hover:bg-muted transition-colors"
                      >
                        Services
                      </button>
                    </div>
                    
                    {/* Mobile Auth Buttons */}
                    <div className="mt-auto p-4 border-t flex flex-col gap-2">
                      {user ? (
                        <Button 
                          onClick={() => handleNavClick(() => navigate('/dashboard'))}
                          className="w-full"
                        >
                          <User className="h-4 w-4 mr-2" />
                          Dashboard
                        </Button>
                      ) : (
                        <>
                          <Button 
                            variant="outline"
                            onClick={() => handleNavClick(() => navigate('/auth'))}
                            className="w-full"
                          >
                            Sign In
                          </Button>
                          <Button 
                            onClick={() => handleNavClick(() => navigate('/auth'))}
                            className="w-full"
                          >
                            <LogIn className="h-4 w-4 mr-2" />
                            Get Started
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        <HeroSection />
        <div id="mission">
          <MissionSection />
        </div>
        <ServicesPreview />
        <CTASection />
      </main>

      <Footer />
    </div>
  );
};

export default Index;
