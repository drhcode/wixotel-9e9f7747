import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SuperAdminDashboard from "@/components/dashboard/SuperAdminDashboard";
import HotelAdminDashboard from "@/components/dashboard/HotelAdminDashboard";
import { Loader2 } from "lucide-react";

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
          .single();

        if (error) throw error;
        if (mounted && roleData?.role) {
          setUserRole(roleData.role);
          sessionStorage.setItem('user_role', roleData.role);
        }
      } catch (err) {
        console.error('Failed to fetch role', err);
        if (mounted) navigate("/auth");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        if (session?.user) {
          // Defer heavy work outside the callback
          setTimeout(() => fetchRole(session.user!.id), 0);
        } else {
          setLoading(false);
          navigate("/auth");
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

  const checkUserAndRole = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;

      if (!session) {
        navigate("/auth");
        return;
      }

      // Get user role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

      if (roleError) throw roleError;

      setUserRole(roleData.role);
    } catch (error) {
      console.error("Error checking user role:", error);
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (userRole === 'super_admin') {
    return <SuperAdminDashboard />;
  }

  return <HotelAdminDashboard />;
};

export default Dashboard;
