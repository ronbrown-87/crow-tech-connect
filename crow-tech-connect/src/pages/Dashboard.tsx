import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import ClientDashboard from '@/components/dashboard/ClientDashboard';
import ServiceProviderDashboard from '@/components/dashboard/ServiceProviderDashboard';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle, RefreshCw, LogOut } from 'lucide-react';

const Dashboard = () => {
  const { user, profile, isAdmin, loading, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [retrying, setRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [stuck, setStuck] = useState(false);

  // Auto-retry profile load if user exists but profile is null (max 3 attempts)
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (!loading && user && !profile && retryCount < 3) {
      setRetrying(true);
      timeout = setTimeout(async () => {
        console.log('[Dashboard] Auto-retrying profile load, attempt:', retryCount + 1);
        await refreshProfile();
        setRetryCount((prev) => prev + 1);
        setRetrying(false);
      }, 1000);
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [loading, user, profile, retryCount, refreshProfile]);

  // Hard watchdog: never allow an infinite loading UI (shows fallback after 20s)
  useEffect(() => {
    if (!(loading || retrying)) {
      setStuck(false);
      return;
    }

    setStuck(false);
    const t = window.setTimeout(() => setStuck(true), 20000);
    return () => window.clearTimeout(t);
  }, [loading, retrying]);

  // Reset retry count when user changes
  useEffect(() => {
    setRetryCount(0);
  }, [user?.id]);

  // Redirect to auth if no user (after loading completes)
  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  // Show loading state while AuthContext is loading or during auto-retry
  if (loading || retrying) {
    if (stuck) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <CardTitle>Dashboard is taking too long</CardTitle>
              <CardDescription>
                Your session or profile request may have been cancelled or is stuck. You can retry safely.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full"
                onClick={async () => {
                  setRetryCount(0);
                  await refreshProfile();
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Re-sync
              </Button>
              <Button className="w-full" variant="outline" onClick={() => window.location.reload()}>
                Reload Page
              </Button>
              <Button
                className="w-full"
                variant="ghost"
                onClick={async () => {
                  await signOut();
                  navigate('/auth', { replace: true });
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">
            {retrying ? 'Loading your profile...' : 'Loading your dashboard...'}
          </p>
        </div>
      </div>
    );
  }

  // Profile not found after retries - show error with options
  if (!profile && user && retryCount >= 3) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <CardTitle>Profile Not Found</CardTitle>
            <CardDescription>
              We couldn't load your profile. This may be temporary.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <Button 
                onClick={async () => {
                  setRetryCount(0);
                  await refreshProfile();
                }}
                className="w-full"
                variant="default"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button 
                onClick={async () => {
                  await signOut();
                  navigate('/auth', { replace: true });
                }}
                variant="ghost"
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Still loading profile (shouldn't happen often)
  if (!profile && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Preparing your dashboard...</p>
        </div>
      </div>
    );
  }

  // No user - redirect to auth
  if (!user || !profile) {
    return <Navigate to="/auth" replace />;
  }

  // Determine user type from profile
  const userType = profile.user_type;
  const approvalStatus = profile.approval_status;

  // Admin users - always allow
  if (userType === 'admin' || isAdmin) {
    console.log('[Dashboard] Rendering admin dashboard');
    return <AdminDashboard />;
  }

  // Service provider users - check approval status
  if (userType === 'service_provider') {
    console.log('[Dashboard] Service provider, status:', approvalStatus);
    
    if (approvalStatus === 'pending') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <CardTitle>Account Pending Approval</CardTitle>
              <CardDescription>
                Your service provider account is pending admin approval. Please wait while we verify your credentials.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={async () => {
                  await signOut();
                  navigate('/auth', { replace: true });
                }}
                variant="outline"
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (approvalStatus === 'rejected') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <CardTitle>Account Rejected</CardTitle>
              <CardDescription>
                Your service provider account application has been rejected. Please contact support for more information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={async () => {
                  await signOut();
                  navigate('/auth', { replace: true });
                }}
                variant="outline"
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (approvalStatus === 'approved') {
      return <ServiceProviderDashboard />;
    }
  }

  // Client users
  if (userType === 'client') {
    console.log('[Dashboard] Rendering client dashboard');
    return <ClientDashboard />;
  }

  // Fallback for unknown user type
  console.error('[Dashboard] Unknown user type:', userType);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <CardTitle>Configuration Error</CardTitle>
          <CardDescription>
            Your account has an unrecognized configuration. Please contact support.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={async () => {
              await signOut();
              navigate('/auth', { replace: true });
            }}
            variant="outline"
            className="w-full"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
