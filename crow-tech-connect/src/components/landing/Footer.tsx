import React from 'react';
import { useNavigate } from 'react-router-dom';
import CreatorModal from '@/components/CreatorModal';
import crowLogo from '@/assets/crow-logo.png';

const Footer = () => {
  const navigate = useNavigate();

  return (
    <footer className="bg-primary border-t border-white/5">
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <img 
                src={crowLogo} 
                alt="CrowTech" 
                className="w-10 h-10 rounded-xl object-contain bg-white/10 p-1" 
              />
              <span className="text-2xl font-display font-bold text-white">CrowTech</span>
            </div>
            <p className="text-white/50 max-w-sm leading-relaxed text-sm">
              Connecting Zambia's finest professionals with those who need them most. Quality service, every time.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Platform</h4>
            <div className="space-y-3">
              <button onClick={() => navigate('/')} className="block text-sm text-white/50 hover:text-secondary transition-colors">Home</button>
              <button onClick={() => navigate('/services')} className="block text-sm text-white/50 hover:text-secondary transition-colors">Services</button>
              <button onClick={() => navigate('/auth')} className="block text-sm text-white/50 hover:text-secondary transition-colors">Join as Provider</button>
              <button onClick={() => navigate('/install')} className="block text-sm text-white/50 hover:text-secondary transition-colors">Install App</button>
            </div>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Company</h4>
            <div className="space-y-3">
              <button onClick={() => document.getElementById('mission')?.scrollIntoView({ behavior: 'smooth' })} className="block text-sm text-white/50 hover:text-secondary transition-colors">About Us</button>
              <span className="block text-sm text-white/50">Lusaka, Zambia</span>
              <span className="block text-sm text-white/50">info@crowtech.zm</span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} CrowTech. All rights reserved.
          </p>
          <CreatorModal />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
