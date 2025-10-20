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
    checkUserAndRole();
  }, []);

  const checkUserAndRole = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
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
