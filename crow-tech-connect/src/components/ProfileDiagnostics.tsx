import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface DiagnosticResult {
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

const ProfileDiagnostics = () => {
  const { user } = useAuth();
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningFix, setRunningFix] = useState(false);

  useEffect(() => {
    if (user?.id) {
      runDiagnostics();
    }
  }, [user]);

  const runDiagnostics = async () => {
    if (!user?.id) return;

    setLoading(true);
    const results: DiagnosticResult[] = [];

    // Test 1: Check if user exists in auth
    try {
      const { data: authUser, error: authError } = await supabase.auth.getUser();
      if (authError) {
        results.push({
          test: 'Auth User Check',
          status: 'fail',
          message: `Error getting auth user: ${authError.message}`,
          details: authError
        });
      } else if (authUser.user?.id === user.id) {
        results.push({
          test: 'Auth User Check',
          status: 'pass',
          message: `Auth user exists: ${authUser.user.email}`
        });
      } else {
        results.push({
          test: 'Auth User Check',
          status: 'warning',
          message: 'Auth user ID mismatch'
        });
      }
    } catch (error: any) {
      results.push({
        test: 'Auth User Check',
        status: 'fail',
        message: `Exception: ${error.message}`,
        details: error
      });
    }

    // Test 2: Check if profile exists (direct query)
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        results.push({
          test: 'Profile Existence Check',
          status: 'fail',
          message: `Error querying profile: ${profileError.message}`,
          details: {
            code: profileError.code,
            details: profileError.details,
            hint: profileError.hint,
            message: profileError.message
          }
        });
      } else if (profile) {
        results.push({
          test: 'Profile Existence Check',
          status: 'pass',
          message: `Profile exists: ${profile.email} (${profile.user_type})`,
          details: profile
        });
      } else {
        results.push({
          test: 'Profile Existence Check',
          status: 'fail',
          message: 'Profile does not exist in database'
        });
      }
    } catch (error: any) {
      results.push({
        test: 'Profile Existence Check',
        status: 'fail',
        message: `Exception: ${error.message}`,
        details: error
      });
    }

    // Test 3: Check RLS policy (try to read own profile)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, user_type')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        if (error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('policy')) {
          results.push({
            test: 'RLS Policy Check',
            status: 'fail',
            message: 'RLS policy is BLOCKING access to your profile!',
            details: {
              code: error.code,
              message: error.message,
              hint: 'You need to run the database migration to fix RLS policies'
            }
          });
        } else {
          results.push({
            test: 'RLS Policy Check',
            status: 'warning',
            message: `RLS check returned error: ${error.message}`,
            details: error
          });
        }
      } else {
        results.push({
          test: 'RLS Policy Check',
          status: 'pass',
          message: 'RLS policy allows reading your profile'
        });
      }
    } catch (error: any) {
      results.push({
        test: 'RLS Policy Check',
        status: 'fail',
        message: `Exception: ${error.message}`,
        details: error
      });
    }

    // Test 4: Check auth.uid() matches user_id
    try {
      const { data: authUser } = await supabase.auth.getUser();
      if (authUser?.user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('user_id', authUser.user.id)
          .maybeSingle();

        if (profile && profile.user_id === authUser.user.id) {
          results.push({
            test: 'User ID Match Check',
            status: 'pass',
            message: `auth.uid() (${authUser.user.id.substring(0, 8)}...) matches profile.user_id`
          });
        } else {
          results.push({
            test: 'User ID Match Check',
            status: 'warning',
            message: 'Could not verify user_id match (profile might not exist)'
          });
        }
      }
    } catch (error: any) {
      results.push({
        test: 'User ID Match Check',
        status: 'fail',
        message: `Exception: ${error.message}`
      });
    }

    setDiagnostics(results);
    setLoading(false);
  };

  const attemptProfileCreation = async () => {
    if (!user?.id || !user?.email) {
      alert('Cannot create profile: missing user information');
      return;
    }

    setRunningFix(true);
    try {
      console.log('[Diagnostics] Attempting to create profile for user:', user.id);

      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser?.user) {
        alert('Cannot get auth user information');
        setRunningFix(false);
        return;
      }

      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          email: user.email || authUser.user.email || '',
          full_name: authUser.user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          user_type: (authUser.user.user_metadata?.user_type as 'client' | 'service_provider' | 'admin') || 'client',
          approval_status: authUser.user.user_metadata?.user_type === 'service_provider' ? 'pending' : 'approved',
          subscription_fee_paid: true
        })
        .select()
        .maybeSingle();

      if (createError) {
        console.error('[Diagnostics] Profile creation error:', createError);
        alert(`Failed to create profile: ${createError.message}\n\nCode: ${createError.code}\n\nThis might be an RLS policy issue. Please run the database migration: 20260111000000_comprehensive_auth_fix.sql`);
        setRunningFix(false);
        return;
      }
      
      if (!newProfile) {
        alert('Profile creation returned no data. Please contact support.');
        setRunningFix(false);
        return;
      }

      console.log('[Diagnostics] Profile created successfully:', newProfile);
      alert('Profile created successfully! Refreshing page...');
      window.location.reload();
    } catch (error: any) {
      console.error('[Diagnostics] Exception creating profile:', error);
      alert(`Exception: ${error.message}`);
      setRunningFix(false);
    }
  };

  const getStatusIcon = (status: 'pass' | 'fail' | 'warning') => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'fail':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: 'pass' | 'fail' | 'warning') => {
    switch (status) {
      case 'pass':
        return <Badge className="bg-green-500">PASS</Badge>;
      case 'fail':
        return <Badge variant="destructive">FAIL</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500">WARNING</Badge>;
    }
  };

  const hasFailures = diagnostics.some(d => d.status === 'fail');
  const rlsFailure = diagnostics.find(d => d.test === 'RLS Policy Check' && d.status === 'fail');
  const profileMissing = diagnostics.find(d => d.test === 'Profile Existence Check' && d.status === 'fail' && d.message.includes('does not exist'));

  return (
    <div className="min-h-screen bg-background p-4">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Profile Diagnostics</CardTitle>
          <CardDescription>
            Diagnostic information to help identify the profile loading issue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <span>Running diagnostics...</span>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {diagnostics.map((result, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result.status)}
                        <span className="font-semibold">{result.test}</span>
                      </div>
                      {getStatusBadge(result.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">{result.message}</p>
                    {result.details && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          Show details
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded overflow-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold">Recommended Actions:</h3>
                  
                  {rlsFailure && (
                    <Card className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-semibold text-yellow-800 dark:text-yellow-200">
                              RLS Policy Issue Detected
                            </p>
                            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                              The Row Level Security policy is blocking access to your profile. You need to run the database migration:
                            </p>
                            <code className="block mt-2 p-2 bg-yellow-100 dark:bg-yellow-900 rounded text-xs">
                              supabase/migrations/20260109000000_fix_profile_loading_issues.sql
                            </code>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {profileMissing && (
                    <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-semibold text-blue-800 dark:text-blue-200">
                              Profile Does Not Exist
                            </p>
                            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                              Your profile was not created during signup. Click the button below to create it manually.
                            </p>
                            <Button
                              onClick={attemptProfileCreation}
                              disabled={runningFix}
                              className="mt-3"
                              variant="default"
                            >
                              {runningFix ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Creating Profile...
                                </>
                              ) : (
                                'Create Profile Now'
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {!hasFailures && (
                    <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-2">
                          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                          <div>
                            <p className="font-semibold text-green-800 dark:text-green-200">
                              All Checks Passed
                            </p>
                            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                              If you're still seeing the error, try refreshing the page or clearing your browser cache.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={runDiagnostics} variant="outline" className="flex-1">
                    Run Diagnostics Again
                  </Button>
                  <Button onClick={() => window.location.reload()} variant="outline" className="flex-1">
                    Refresh Page
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileDiagnostics;

