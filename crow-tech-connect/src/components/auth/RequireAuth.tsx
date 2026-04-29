import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2, LogOut, RefreshCw } from "lucide-react";

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading, refreshProfile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [stuck, setStuck] = useState(false);

  const needsGate = useMemo(() => {
    if (loading) return true;
    if (user && !profile) return true;
    return false;
  }, [loading, user, profile]);

  useEffect(() => {
    if (!needsGate) {
      setStuck(false);
      return;
    }

    const t = window.setTimeout(() => setStuck(true), 20000);
    return () => window.clearTimeout(t);
  }, [needsGate]);

  if (loading) {
    if (stuck) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <CardTitle>Session is taking too long</CardTitle>
              <CardDescription>
                Your session rehydration may have been interrupted. You can safely retry.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Page
              </Button>
              <Button
                className="w-full"
                variant="ghost"
                onClick={async () => {
                  await signOut();
                  navigate("/auth", { replace: true });
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
          <p className="text-sm text-muted-foreground">Rehydrating your session…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  if (!profile) {
    if (stuck) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <CardTitle>Profile is taking too long</CardTitle>
              <CardDescription>
                We couldn’t load your profile yet. Retry, reload, or sign out to recover.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full"
                onClick={async () => {
                  setStuck(false);
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
                  navigate("/auth", { replace: true });
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
          <p className="text-sm text-muted-foreground">Loading your profile…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default RequireAuth;
