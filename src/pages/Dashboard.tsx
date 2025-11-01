import { useEffect, useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

// Lazy load components OUTSIDE the component to prevent recreation on every render
const LazySuperAdminDashboard = lazy(() => import("@/components/dashboard/SuperAdminDashboard"));
const LazyHotelAdminDashboard = lazy(() => import("@/components/dashboard/HotelAdminDashboard"));

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'super_admin' | 'hotel_admin' | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchRole = async (userId: string) => {
      try {
        const { data: roleData, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle();

        if (error && (error as any).code !== 'PGRST116') throw error;
        const role = roleData?.role ?? 'hotel_admin';
        if (mounted) {
          setUserRole(role);
          sessionStorage.setItem('user_role', role);
        }
      } catch (err) {
        console.error('Failed to fetch role', err);
        if (mounted) navigate("/auth");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const checkUserAndRole = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        if (!session) {
          if (mounted) {
            setLoading(false);
            navigate("/auth");
          }
          return;
        }

        // Get user role (fallback to 'hotel_admin' if none)
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (roleError && (roleError as any).code !== 'PGRST116') throw roleError;

        const role = roleData?.role ?? 'hotel_admin';

        if (mounted) {
          setUserRole(role);
          sessionStorage.setItem('user_role', role);
        }
      } catch (error) {
        console.error("Error checking user role:", error);
        if (mounted) {
          setLoading(false);
          navigate("/auth");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          // Defer heavy work outside the callback
          setTimeout(() => fetchRole(session.user!.id), 0);
        }
      } else if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem('user_role');
        navigate("/auth");
      }
    });

    // Then check for existing session
    checkUserAndRole();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      {userRole === 'super_admin' ? <LazySuperAdminDashboard /> : <LazyHotelAdminDashboard />}
    </Suspense>
  );
};

export default Dashboard;
