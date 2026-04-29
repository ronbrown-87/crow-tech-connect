import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  location: string | null;
  user_type: 'client' | 'service_provider' | 'admin';
  approval_status: 'pending' | 'approved' | 'rejected';
  subscription_fee_paid: boolean;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, userType?: 'client' | 'service_provider', serviceCategories?: string[]) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  deleteAccount: () => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const initializingRef = useRef(false);
  const profileCacheRef = useRef<{ userId: string; profile: Profile; timestamp: number } | null>(null);
  const profileRef = useRef<Profile | null>(null);
  const profileFetchAbortRef = useRef<AbortController | null>(null);
  const profileFetchSeqRef = useRef(0);
  const initialSessionHandledRef = useRef(false);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  // Fast profile fetch with cache + abort/timeout safety (prevents infinite loading)
  const fetchProfile = useCallback(async (userId: string, forceRefresh = false): Promise<Profile | null> => {
    // Check cache first (valid for 30 seconds unless force refresh)
    const cached = profileCacheRef.current;
    if (!forceRefresh && cached && cached.userId === userId && Date.now() - cached.timestamp < 30000) {
      console.log('[AuthContext] Using cached profile');
      return cached.profile;
    }

    // Abort any previous in-flight profile request (e.g. user navigated away or request got stuck)
    profileFetchAbortRef.current?.abort();

    const controller = new AbortController();
    profileFetchAbortRef.current = controller;
    const requestSeq = ++profileFetchSeqRef.current;

    const timeoutMs = 12000;
    const timeoutId = window.setTimeout(() => {
      try {
        controller.abort();
      } catch {
        // ignore
      }
    }, timeoutMs);

    const runQuery = async () => {
      return await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .abortSignal(controller.signal)
        .maybeSingle();
    };

    try {
      const { data, error } = await runQuery();

      if (error) {
        // Abort is expected in navigation/refresh scenarios — don't treat as fatal.
        console.warn('[AuthContext] Profile fetch error:', error.message);
        return null;
      }

      if (data) {
        console.log('[AuthContext] Profile loaded:', data.user_type);
        profileCacheRef.current = { userId, profile: data, timestamp: Date.now() };
        return data;
      }

      // Profile not found - try one quick retry after 500ms (for new users)
      await new Promise(resolve => setTimeout(resolve, 500));
      if (controller.signal.aborted) return null;

      const { data: retryData, error: retryError } = await runQuery();

      if (retryError) {
        console.warn('[AuthContext] Profile retry error:', retryError.message);
        return null;
      }

      if (retryData) {
        profileCacheRef.current = { userId, profile: retryData, timestamp: Date.now() };
      }

      return retryData || null;
    } catch (error) {
      // When a request is aborted, fetch throws; ensure we ALWAYS resolve.
      const name = (error as { name?: string } | null)?.name;
      if (name === 'AbortError') {
        console.warn('[AuthContext] Profile request aborted');
        return null;
      }
      console.error('[AuthContext] Unexpected error:', error);
      return null;
    } finally {
      window.clearTimeout(timeoutId);
      // Only clear abort ref if this is still the latest request
      if (profileFetchSeqRef.current === requestSeq) {
        profileFetchAbortRef.current = null;
      }
    }
  }, []);

  // Refresh profile - exposed for manual refresh
  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;

    const profileData = await fetchProfile(user.id, true);
    if (mountedRef.current && profileData) {
      setProfile(profileData);
      setIsAdmin(profileData.user_type === 'admin');
    }
  }, [user?.id, fetchProfile]);

  // Load profile and update state - ensures loading always completes
  const loadProfile = useCallback(
    async (userId: string, isInitial = false) => {
      if (!mountedRef.current) return;

      try {
        // Don't fetch if we already have a fresh cached profile for this user
        const cached = profileCacheRef.current;
        if (cached && cached.userId === userId && Date.now() - cached.timestamp < 30000) {
          setProfile(cached.profile);
          setIsAdmin(cached.profile.user_type === 'admin');
          return;
        }

        const profileData = await fetchProfile(userId);
        if (!mountedRef.current) return;

        if (profileData) {
          setProfile(profileData);
          setIsAdmin(profileData.user_type === 'admin');
          console.log('[AuthContext] Profile loaded successfully:', {
            user_type: profileData.user_type,
            approval_status: profileData.approval_status,
            isAdmin: profileData.user_type === 'admin',
          });
        } else {
          setProfile(null);
          setIsAdmin(false);
          console.warn('[AuthContext] Profile not found for user:', userId);
        }
      } catch (e) {
        console.error('[AuthContext] loadProfile failed:', e);
        if (mountedRef.current) {
          setProfile(null);
          setIsAdmin(false);
        }
      } finally {
        // Critical: never allow initial loading to hang forever
        if (mountedRef.current && isInitial) setLoading(false);
      }
    },
    [fetchProfile]
  );

  useEffect(() => {
    mountedRef.current = true;
    let authSubscription: { unsubscribe: () => void } | null = null;

    // Prevent double initialization
    if (initializingRef.current) return;
    initializingRef.current = true;

    const handleSignedOut = () => {
      setProfile(null);
      setIsAdmin(false);
      setUser(null);
      setSession(null);
      profileCacheRef.current = null;
      setLoading(false);
    };

    const queueProfileLoad = (userId: string, isInitial: boolean) => {
      // Never call Supabase inside onAuthStateChange; defer to next tick.
      window.setTimeout(() => {
        void loadProfile(userId, isInitial);
      }, 0);
    };

    const applySession = (newSession: Session | null, opts: { isInitial: boolean }) => {
      if (!mountedRef.current) return;

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (!newSession?.user) {
        setProfile(null);
        setIsAdmin(false);
        profileCacheRef.current = null;
        if (opts.isInitial) setLoading(false);
        return;
      }

      // Keep the UI gated until the profile load resolves.
      if (opts.isInitial) setLoading(true);
      queueProfileLoad(newSession.user.id, opts.isInitial);
    };

  // Subscribe first (prevents missing INITIAL_SESSION on refresh)
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
    console.log('[AuthContext] Auth state changed:', event);
    if (!mountedRef.current) return;

    if (event === 'SIGNED_OUT') {
      handleSignedOut();
      return;
    }

    // Avoid double-hydrating INITIAL_SESSION (getSession + event can both fire)
    if (event === 'INITIAL_SESSION') {
      if (initialSessionHandledRef.current) return;
      initialSessionHandledRef.current = true;
      setLoading(true);
      applySession(newSession, { isInitial: true });
      return;
    }

    if (event === 'SIGNED_IN') {
      setLoading(true);
      applySession(newSession, { isInitial: true });
      return;
    }

    if (event === 'TOKEN_REFRESHED') {
      // Never block the UI here; refresh profile in the background.
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) queueProfileLoad(newSession.user.id, false);
      return;
    }

    // Fallback for other events
    applySession(newSession ?? null, { isInitial: false });
  });

  authSubscription = subscription;

    // Hydrate from storage/session
    const initializeAuth = async () => {
      const watchdogMs = 15000;
      const watchdogId = window.setTimeout(() => {
        if (!mountedRef.current) return;
        console.warn('[AuthContext] Auth initialization timed out; releasing loading state');
        setLoading(false);
      }, watchdogMs);

      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!mountedRef.current) return;

        if (error) {
          console.error('[AuthContext] Session error:', error);
          setLoading(false);
          return;
        }

        // If INITIAL_SESSION already handled via the subscription, don't do it again.
        if (initialSessionHandledRef.current) {
          setLoading(false);
          return;
        }

        initialSessionHandledRef.current = true;
        setLoading(true);
        applySession(session, { isInitial: true });
      } catch (error) {
        console.error('[AuthContext] Init error:', error);
        if (mountedRef.current) setLoading(false);
      } finally {
        window.clearTimeout(watchdogId);
      }

    };

    initializeAuth();

    return () => {
      mountedRef.current = false;
      authSubscription?.unsubscribe();
      // Abort any in-flight profile request so navigation/backgrounding can't leave pending promises.
      profileFetchAbortRef.current?.abort();
      profileFetchAbortRef.current = null;
    };
  }, [loadProfile]);

  const signUp = async (email: string, password: string, fullName: string, userType: 'client' | 'service_provider' = 'client', serviceCategories?: string[]) => {
    try {
      const currentOrigin = window.location.origin;
      const redirectUrl = `${currentOrigin}/dashboard`;
      
      console.log('[AuthContext] Signing up user:', email, userType);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            user_type: userType,
            ...(serviceCategories && { service_categories: serviceCategories })
          }
        }
      });
      
      if (error) {
        console.error('[AuthContext] Sign up error:', error);
        return { error: new Error(error.message) };
      }

      // For service providers, send approval email to admin
      if (userType === 'service_provider') {
        try {
          await supabase.functions.invoke('notify-provider-signup', {
            body: { providerName: fullName, providerEmail: email, userType }
          });
        } catch (e) {
          console.error('[AuthContext] Failed to send notification:', e);
        }
        
        // Wait for profile to be created, then create service provider entry
        if (data.user && serviceCategories && serviceCategories.length > 0) {
          let attempts = 0;
          const maxAttempts = 10;
          const createProviderEntry = async () => {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('id, user_type')
              .eq('user_id', data.user.id)
              .maybeSingle();
            
            if (profileData && profileData.user_type === 'service_provider') {
              const { data: existingProvider } = await supabase
                .from('service_providers')
                .select('id')
                .eq('profile_id', profileData.id)
                .maybeSingle();
              
              if (!existingProvider) {
                await supabase
                  .from('service_providers')
                  .insert({
                    profile_id: profileData.id,
                    service_categories: serviceCategories as ('construction' | 'plumbing' | 'electrical' | 'roofing' | 'tiling' | 'surveying' | 'maintenance')[]
                  });
              }
            } else if (attempts < maxAttempts) {
              attempts++;
              setTimeout(createProviderEntry, 500);
            }
          };
          
          setTimeout(createProviderEntry, 1000);
        }
      }
      
      // If session exists immediately (email confirmation disabled), load profile
      if (data.session) {
        console.log('[AuthContext] Session created immediately, loading profile...');
        await loadProfile(data.user.id, true);
      }
      
      return { error: null };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      console.error('[AuthContext] Sign up exception:', errorMessage);
      return { error: new Error(errorMessage) };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('[AuthContext] Signing in user:', email);
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('[AuthContext] Sign in error:', error);
        setLoading(false);
        return { error: new Error(error.message) };
      }

      if (!data.user) {
        setLoading(false);
        return { error: new Error('No user data returned from sign in') };
      }

      // Load profile immediately
      const profileData = await fetchProfile(data.user.id, true);
      
      if (profileData) {
        setProfile(profileData);
        setIsAdmin(profileData.user_type === 'admin');
        console.log('[AuthContext] Profile loaded:', {
          user_type: profileData.user_type,
          approval_status: profileData.approval_status
        });
      } else {
        console.warn('[AuthContext] Profile not found after sign in');
      }

      setLoading(false);
      return { error: null };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during sign in';
      console.error('[AuthContext] Sign in exception:', errorMessage);
      setLoading(false);
      return { error: new Error(errorMessage) };
    }
  };

  const signOut = async () => {
    console.log('[AuthContext] Signing out...');
    try {
      // Clear state immediately for fast UI feedback
      setProfile(null);
      setIsAdmin(false);
      setUser(null);
      setSession(null);
      profileCacheRef.current = null;
      setLoading(false);
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      console.log('[AuthContext] Sign out successful');
    } catch (error) {
      console.error('[AuthContext] Exception during sign out:', error);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('No user logged in') };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id);

    if (!error && profile) {
      const updatedProfile = { ...profile, ...updates };
      setProfile(updatedProfile);
      // Update cache
      profileCacheRef.current = { userId: user.id, profile: updatedProfile, timestamp: Date.now() };
      if (updates.user_type !== undefined) {
        setIsAdmin(updates.user_type === 'admin');
      }
    }

    return { error: error ? new Error(error.message) : null };
  };

  const deleteAccount = async () => {
    if (!user || !profile) return { error: new Error('No user logged in') };

    try {
      const { error } = await supabase.functions.invoke('delete-user-account');
      
      if (error) throw error;

      await signOut();

      return { error: null };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete account';
      return { error: new Error(errorMessage) };
    }
  };

  const value = {
    user,
    session,
    profile,
    isAdmin,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    deleteAccount,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
