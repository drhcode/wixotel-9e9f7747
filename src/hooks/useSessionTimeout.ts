import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
const WARNING_TIME = 25 * 60 * 1000; // 25 minutes
const TIMEOUT_TIME = 30 * 60 * 1000; // 30 minutes
const CHECK_INTERVAL = 1000; // Check every second

export const useSessionTimeout = () => {
  const [showWarning, setShowWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(5 * 60); // 5 minutes in seconds
  const lastActivityRef = useRef(Date.now());
  const warningShownRef = useRef(false);
  const navigate = useNavigate();

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (warningShownRef.current) {
      setShowWarning(false);
      warningShownRef.current = false;
      setRemainingTime(5 * 60);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      sessionStorage.clear();
      toast.info('Your session has expired. Please log in again.');
      navigate('/auth', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/auth', { replace: true });
    }
  }, [navigate]);

  const extendSession = useCallback(() => {
    resetTimer();
    toast.success('Session extended');
  }, [resetTimer]);

  useEffect(() => {
    // Check if "Remember Me" was selected - skip timeout if true
    const rememberMe = localStorage.getItem('rememberMe') === 'true';
    if (rememberMe) {
      return;
    }

    // Add activity listeners
    const handleActivity = () => {
      if (!warningShownRef.current) {
        lastActivityRef.current = Date.now();
      }
    };

    ACTIVITY_EVENTS.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Check timeout interval
    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivityRef.current;

      if (timeSinceActivity >= TIMEOUT_TIME) {
        // Session expired - logout
        clearInterval(interval);
        handleLogout();
      } else if (timeSinceActivity >= WARNING_TIME && !warningShownRef.current) {
        // Show warning
        warningShownRef.current = true;
        setShowWarning(true);
      }

      // Update remaining time when warning is shown
      if (warningShownRef.current) {
        const timeLeft = Math.max(0, Math.ceil((TIMEOUT_TIME - timeSinceActivity) / 1000));
        setRemainingTime(timeLeft);
      }
    }, CHECK_INTERVAL);

    return () => {
      clearInterval(interval);
      ACTIVITY_EVENTS.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [handleLogout]);

  return {
    showWarning,
    remainingTime,
    extendSession,
    logout: handleLogout,
  };
};
