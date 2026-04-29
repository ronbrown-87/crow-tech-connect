import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, LogOut, Home, Briefcase } from 'lucide-react';
import crowLogo from '@/assets/crow-logo.png';

const Navbar = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <nav className="border-b bg-primary text-white">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <img src={crowLogo} alt="CrowTech" className="w-8 h-8 rounded-lg object-contain bg-white/10" />
            <span className="text-2xl font-display font-bold text-white">CrowTech</span>
          </Link>

          <div className="flex items-center space-x-4">
            {/* Navigation Links */}
            <Button 
              variant="ghost" 
              className="text-white hover:bg-white/10 hidden sm:flex"
              onClick={() => navigate('/')}
            >
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
            <Button 
              variant="ghost" 
              className="text-white hover:bg-white/10 hidden sm:flex"
              onClick={() => navigate('/services')}
            >
              <Briefcase className="h-4 w-4 mr-2" />
              Services
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 rounded-full hover:bg-white/10 flex items-center gap-2 px-2">
                  <Avatar className="h-8 w-8 border-2 border-secondary">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-secondary text-white text-sm">
                      {profile?.full_name ? getInitials(profile.full_name) : <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-white font-medium hidden md:block">
                    {profile?.full_name || 'User'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">{profile?.full_name || 'User'}</p>
                    <p className="w-[200px] truncate text-sm text-muted-foreground">
                      {profile?.user_type === 'service_provider' ? 'Service Provider' : 'Client'}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/dashboard')} className="cursor-pointer">
                  <Briefcase className="mr-2 h-4 w-4" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/services')} className="cursor-pointer">
                  <Home className="mr-2 h-4 w-4" />
                  Browse Services
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;