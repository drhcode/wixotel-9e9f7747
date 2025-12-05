import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Clock, LogOut } from 'lucide-react';

interface SessionTimeoutModalProps {
  isOpen: boolean;
  remainingTime: number;
  onExtend: () => void;
  onLogout: () => void;
}

export const SessionTimeoutModal = ({
  isOpen,
  remainingTime,
  onExtend,
  onLogout,
}: SessionTimeoutModalProps) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center">
              <Clock className="w-8 h-8 text-warning animate-pulse" />
            </div>
          </div>
          <AlertDialogTitle className="text-center text-xl">
            Session Expiring Soon
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center space-y-3">
            <p>
              Your session will expire due to inactivity. You will be automatically logged out in:
            </p>
            <div className="text-4xl font-mono font-bold text-foreground">
              {formatTime(remainingTime)}
            </div>
            <p className="text-sm">
              Click "Stay Logged In" to continue your session, or "Log Out" to end it now.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <AlertDialogCancel
            onClick={onLogout}
            className="w-full sm:w-auto flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onExtend}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90"
          >
            Stay Logged In
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
