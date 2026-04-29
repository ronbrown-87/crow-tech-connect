import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { 
  Users, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  TrendingUp,
  Building2,
  DollarSign,
  Calendar,
  MapPin,
  Phone,
  Loader2
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/currency';

interface PendingUser {
  id: string;
  full_name: string;
  email: string;
  user_type: string;
  created_at: string;
  approval_status: string;
  location: string | null;
  phone: string | null;
}

interface DashboardStats {
  totalUsers: number;
  pendingApprovals: number;
  totalRequests: number;
  totalRevenue: number;
}

const AdminDashboard = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    pendingApprovals: 0,
    totalRequests: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  // Ensure only admins can access this dashboard
  if (profile?.user_type !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You must be an administrator to access this dashboard.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  useEffect(() => {
    // Only fetch if user is admin
    if (profile?.user_type === 'admin') {
      fetchPendingUsers();
      fetchDashboardStats();
    }
  }, [profile]);

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      // Only fetch pending service providers for approval
      // Note: RLS policy should allow admins to view all profiles including pending ones
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('approval_status', 'pending')
        .eq('user_type', 'service_provider')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[AdminDashboard] Error fetching pending users:', error);
        console.error('[AdminDashboard] Error code:', error.code);
        console.error('[AdminDashboard] Error message:', error.message);
        throw error;
      }
      
      console.log('[AdminDashboard] Fetched pending service providers:', data?.length || 0);
      setPendingUsers(data || []);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[AdminDashboard] Error fetching pending users:', errorMessage);
      toast({
        title: 'Error',
        description: `Failed to fetch pending approvals: ${errorMessage}`,
        variant: 'destructive'
      });
      setPendingUsers([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      // Fetch total approved users (clients + service providers)
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('approval_status', 'approved');

      // Fetch pending service provider approvals only
      const { count: pendingApprovals } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('approval_status', 'pending')
        .eq('user_type', 'service_provider');

      // Fetch total service requests
      const { count: totalRequests } = await supabase
        .from('service_requests')
        .select('*', { count: 'exact', head: true });

      // Fetch total revenue
      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'completed');

      const totalRevenue = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

      setStats({
        totalUsers: totalUsers || 0,
        pendingApprovals: pendingApprovals || 0,
        totalRequests: totalRequests || 0,
        totalRevenue
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error fetching dashboard stats:', errorMessage);
      toast({
        title: 'Error',
        description: 'Failed to fetch dashboard statistics',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          approval_status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .eq('user_type', 'service_provider'); // Ensure we only approve service providers

      if (error) throw error;

      toast({
        title: 'Service Provider Approved',
        description: 'The service provider has been approved and can now access the platform.',
      });

      fetchPendingUsers();
      fetchDashboardStats();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error',
        description: errorMessage || 'Failed to approve service provider',
        variant: 'destructive'
      });
    }
  };

  const rejectUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          approval_status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .eq('user_type', 'service_provider'); // Ensure we only reject service providers

      if (error) throw error;

      toast({
        title: 'Service Provider Rejected',
        description: 'The service provider application has been rejected.',
      });

      fetchPendingUsers();
      fetchDashboardStats();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error',
        description: errorMessage || 'Failed to reject service provider',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage users, approvals, and platform operations.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRequests}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="approvals" className="w-full">
          <TabsList>
            <TabsTrigger value="approvals">Pending Approvals</TabsTrigger>
            <TabsTrigger value="users">All Users</TabsTrigger>
          </TabsList>

          <TabsContent value="approvals" className="space-y-6">
            {loading ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
                  <p className="text-sm text-muted-foreground">Loading pending approvals...</p>
                </CardContent>
              </Card>
            ) : pendingUsers.length === 0 ? (
              <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-900">
                <CardContent className="text-center py-12">
                  <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">All Clear! 🎉</h3>
                  <p className="text-muted-foreground">No pending service provider approvals. All applications have been reviewed.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    {pendingUsers.length} Pending Approval{pendingUsers.length !== 1 ? 's' : ''}
                  </h3>
                  <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                    Requires Review
                  </Badge>
                </div>
                {pendingUsers.map((user) => (
                  <Card key={user.id} className="border-l-4 border-l-yellow-500 hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl mb-1">{user.full_name || 'No Name Provided'}</CardTitle>
                          <CardDescription className="text-base">{user.email}</CardDescription>
                        </div>
                        <Badge variant="outline" className="capitalize ml-4">
                          Service Provider
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              <strong>Applied:</strong> {new Date(user.created_at).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </span>
                          </div>
                          {user.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                <strong>Location:</strong> {user.location}
                              </span>
                            </div>
                          )}
                          {user.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                <strong>Phone:</strong> {user.phone}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-3 pt-2 border-t">
                          <Button 
                            onClick={() => approveUser(user.id)}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve Provider
                          </Button>
                          <Button 
                            onClick={() => rejectUser(user.id)}
                            variant="destructive"
                            className="flex-1 shadow-md hover:shadow-lg transition-all"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject Provider
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardContent className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">User Management</h3>
                <p className="text-muted-foreground">Advanced user management features coming soon.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;