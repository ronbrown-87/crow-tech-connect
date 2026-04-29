import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, User, Sparkles } from 'lucide-react';

const CreatorModal = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="text-white/70 hover:text-secondary hover:bg-white/10 transition-colors"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Created by Maron
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display text-center">
            Meet the Creator
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center py-6 space-y-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-elegant">
            <User className="h-12 w-12 text-white" />
          </div>
          
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-foreground">Maron Nyirongo</h3>
            <p className="text-muted-foreground">Full Stack Developer & Creator</p>
          </div>
          
          <div className="w-full space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3 h-12 border-border hover:bg-secondary hover:text-white hover:border-secondary transition-all"
              onClick={() => window.open('tel:+260763011947', '_self')}
            >
              <Phone className="h-5 w-5" />
              <span>+260 763 011 947</span>
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3 h-12 border-border hover:bg-secondary hover:text-white hover:border-secondary transition-all"
              onClick={() => window.open('tel:+260972601568', '_self')}
            >
              <Phone className="h-5 w-5" />
              <span>+260 972 601 568</span>
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground text-center mt-4">
            Building solutions that connect communities 🇿🇲
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatorModal;
