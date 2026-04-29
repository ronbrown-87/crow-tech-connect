import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Building2, Mail, ArrowLeft, Sparkles, Shield, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { signInSchema, signUpSchema, SignInData, SignUpData } from '@/lib/validations';
import { z } from 'zod';
import PasswordStrengthIndicator from '@/components/PasswordStrengthIndicator';

const Auth = () => {
  const { user, signUp, signIn, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const redirectTo = (() => {
    const pathname = (location.state as any)?.from?.pathname;
    if (typeof pathname === 'string' && pathname && pathname !== '/auth') return pathname;
    return '/dashboard';
  })();

  const [signInData, setSignInData] = useState<SignInData>({
    email: '',
    password: ''
  });

  const [signUpData, setSignUpData] = useState<SignUpData>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    userType: 'client'
  });
  
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [availableCategories] = useState<string[]>([
    'construction',
    'plumbing',
    'electrical',
    'roofing',
    'tiling',
    'surveying',
    'maintenance'
  ]);

  const [signInErrors, setSignInErrors] = useState<Partial<Record<keyof SignInData, string>>>({});
  const [signUpErrors, setSignUpErrors] = useState<Partial<Record<keyof SignUpData, string>>>({});
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      navigate(redirectTo, { replace: true });
    }
  }, [user, loading, navigate, redirectTo]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInErrors({});

    try {
      signInSchema.parse(signInData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<Record<keyof SignInData, string>> = {};
        error.issues.forEach((issue) => {
          if (issue.path[0]) {
            fieldErrors[issue.path[0] as keyof SignInData] = issue.message;
          }
        });
        setSignInErrors(fieldErrors);
        return;
      }
    }

    setIsLoading(true);

    try {
      const { error } = await signIn(signInData.email, signInData.password);
      
      if (error) {
        toast({
          title: 'Sign In Failed',
          description: error instanceof Error ? error.message : 'An error occurred during sign in',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      } else {
        toast({
          title: 'Welcome back!',
          description: 'Redirecting to your dashboard...',
        });
        // Navigation handled by useEffect when user state updates
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpErrors({});

    try {
      signUpSchema.parse(signUpData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<Record<keyof SignUpData, string>> = {};
        error.issues.forEach((issue) => {
          if (issue.path[0]) {
            fieldErrors[issue.path[0] as keyof SignUpData] = issue.message;
          }
        });
        setSignUpErrors(fieldErrors);
        return;
      }
    }

    setIsLoading(true);

    if (signUpData.userType === 'service_provider' && selectedCategories.length === 0) {
      toast({
        title: 'Service Categories Required',
        description: 'Please select at least one service category you can provide.',
        variant: 'destructive'
      });
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await signUp(
        signUpData.email, 
        signUpData.password, 
        signUpData.fullName, 
        signUpData.userType,
        signUpData.userType === 'service_provider' ? selectedCategories : undefined
      );
      
      if (error) {
        toast({
          title: 'Sign Up Failed',
          description: error instanceof Error ? error.message : 'An error occurred during sign up',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      } else {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          toast({
            title: 'Account Created!',
            description: 'You are signed in and ready to go.',
          });
          navigate('/dashboard');
        } else {
          if (signUpData.userType === 'service_provider') {
            toast({
              title: 'Registration Submitted! ✅',
              description: 'Your registration is pending admin approval. You will receive an email once approved.',
            });
            setSignUpData({
              email: '',
              password: '',
              confirmPassword: '',
              fullName: '',
              userType: 'client'
            });
            setSelectedCategories([]);
          } else {
            toast({
              title: 'Account Created! ✅',
              description: 'Please check your email to verify your account.',
            });
          }
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!forgotPasswordEmail) {
      toast({
        title: 'Email Required',
        description: 'Please enter your email address',
        variant: 'destructive'
      });
      return;
    }

    setForgotPasswordLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to send password reset email',
          variant: 'destructive'
        });
      } else {
        setForgotPasswordSent(true);
        toast({
          title: 'Password Reset Email Sent',
          description: 'Please check your email for instructions to reset your password.',
        });
      }
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary to-primary-glow">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-white" />
          <p className="text-white/90 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-primary-glow flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-2xl border-0">
            <CardHeader className="space-y-3 pb-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotPasswordEmail('');
                    setForgotPasswordSent(false);
                  }}
                  className="rounded-full"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="flex-1 text-2xl">Reset Password</CardTitle>
              </div>
              <CardDescription className="text-base">
                {forgotPasswordSent 
                  ? 'Check your email for password reset instructions'
                  : 'Enter your email address and we\'ll send you instructions to reset your password'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {forgotPasswordSent ? (
                <div className="space-y-6 text-center py-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      We've sent a password reset link to
                    </p>
                    <p className="font-semibold text-base">{forgotPasswordEmail}</p>
                    <p className="text-sm text-muted-foreground">
                      Please check your email and click the link to reset your password.
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotPasswordEmail('');
                      setForgotPasswordSent(false);
                    }}
                    className="w-full"
                  >
                    Back to Sign In
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email" className="text-base">Email Address</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="you@example.com"
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      className="h-12 text-base"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full h-12 text-base" disabled={forgotPasswordLoading}>
                    {forgotPasswordLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-5 w-5" />
                        Send Reset Link
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-primary-glow flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-white/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Branding */}
        <div className="text-center mb-8 space-y-4">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-2xl blur-xl" />
              <div className="relative bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/20">
                <Building2 className="h-12 w-12 text-white" />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">
              CrowTech
            </h1>
            <p className="text-white/90 text-lg font-medium">Professional Construction Services</p>
            <p className="text-white/70 text-sm">Connect with trusted service providers</p>
          </div>
        </div>

        <Card className="shadow-2xl border-0 backdrop-blur-sm bg-card/95">
          <CardHeader className="space-y-2 pb-6">
            <CardTitle className="text-2xl font-bold text-center">Welcome</CardTitle>
            <CardDescription className="text-center text-base">
              Sign in to your account or create a new one to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-12 mb-6">
                <TabsTrigger value="signin" className="text-base font-medium">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="text-base font-medium">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-5 mt-6">
                <form onSubmit={handleSignIn} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-base font-medium">Email Address</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signInData.email}
                      onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                      className={`h-12 text-base ${signInErrors.email ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      required
                    />
                    {signInErrors.email && (
                      <p className="text-sm text-destructive font-medium">{signInErrors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-base font-medium">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="Enter your password"
                      value={signInData.password}
                      onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                      className={`h-12 text-base ${signInErrors.password ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      required
                    />
                    {signInErrors.password && (
                      <p className="text-sm text-destructive font-medium">{signInErrors.password}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-end pt-1">
                    <Button
                      type="button"
                      variant="link"
                      className="px-0 text-sm h-auto font-medium"
                      onClick={() => setShowForgotPassword(true)}
                    >
                      Forgot password?
                    </Button>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        Sign In
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-5 mt-6">
                <form onSubmit={handleSignUp} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-base font-medium">Full Name</Label>
                    <Input
                      id="signup-name"
                      placeholder="John Doe"
                      value={signUpData.fullName}
                      onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                      className={`h-12 text-base ${signUpErrors.fullName ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      required
                    />
                    {signUpErrors.fullName && (
                      <p className="text-sm text-destructive font-medium">{signUpErrors.fullName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-base font-medium">Email Address</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signUpData.email}
                      onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                      className={`h-12 text-base ${signUpErrors.email ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      required
                    />
                    {signUpErrors.email && (
                      <p className="text-sm text-destructive font-medium">{signUpErrors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-type" className="text-base font-medium">I am a</Label>
                    <Select
                      value={signUpData.userType}
                      onValueChange={(value) => {
                        setSignUpData({ ...signUpData, userType: value as 'client' | 'service_provider' });
                        if (value === 'client') setSelectedCategories([]);
                      }}
                    >
                      <SelectTrigger className={`h-12 text-base ${signUpErrors.userType ? 'border-destructive' : ''}`}>
                        <SelectValue placeholder="Select user type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client" className="text-base">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>Client (Looking for services)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="service_provider" className="text-base">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            <span>Service Provider (Offering services)</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {signUpErrors.userType && (
                      <p className="text-sm text-destructive font-medium">{signUpErrors.userType}</p>
                    )}
                  </div>
                  
                  {signUpData.userType === 'service_provider' && (
                    <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
                      <Label className="text-base font-medium">Service Categories</Label>
                      <p className="text-sm text-muted-foreground">Select all services you can provide</p>
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        {availableCategories.map((category) => (
                          <div key={category} className="flex items-center space-x-2 group">
                            <input
                              type="checkbox"
                              id={`category-${category}`}
                              checked={selectedCategories.includes(category)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCategories([...selectedCategories, category]);
                                } else {
                                  setSelectedCategories(selectedCategories.filter(c => c !== category));
                                }
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                            />
                            <Label 
                              htmlFor={`category-${category}`}
                              className="text-sm font-normal cursor-pointer capitalize group-hover:text-primary transition-colors"
                            >
                              {category.replace('_', ' ')}
                            </Label>
                          </div>
                        ))}
                      </div>
                      {selectedCategories.length === 0 && (
                        <p className="text-sm text-destructive font-medium mt-2">Please select at least one service category</p>
                      )}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-base font-medium">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Create a strong password"
                      value={signUpData.password}
                      onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                      className={`h-12 text-base ${signUpErrors.password ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      required
                    />
                    <PasswordStrengthIndicator password={signUpData.password} />
                    {signUpErrors.password && (
                      <p className="text-sm text-destructive font-medium">{signUpErrors.password}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-base font-medium">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Re-enter your password"
                      value={signUpData.confirmPassword}
                      onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
                      className={`h-12 text-base ${signUpErrors.confirmPassword ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      required
                    />
                    {signUpErrors.confirmPassword && (
                      <p className="text-sm text-destructive font-medium">{signUpErrors.confirmPassword}</p>
                    )}
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        Create Account
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer text */}
        <p className="text-center text-white/60 text-xs mt-6 relative z-10">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default Auth;
