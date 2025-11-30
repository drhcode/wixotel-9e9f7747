/**
 * Maps database and API errors to user-friendly messages
 * Prevents internal details from being exposed to users
 */

export const mapDatabaseError = (error: any): string => {
  // PostgreSQL error codes
  if (error.code === '23505') return 'This record already exists';
  if (error.code === '23503') return 'Cannot delete - related records exist';
  if (error.code === '23502') return 'Required field is missing';
  if (error.code === '23514') return 'Invalid data provided';
  if (error.code === '42P01') return 'Data not found';
  
  // Check for common error message patterns
  if (error.message?.includes('violates')) return 'Data validation failed';
  if (error.message?.includes('duplicate key')) return 'This record already exists';
  if (error.message?.includes('foreign key')) return 'Cannot perform this action - related data exists';
  if (error.message?.includes('not found')) return 'Record not found';
  if (error.message?.includes('permission denied')) return 'You do not have permission to perform this action';
  
  // Generic fallback
  return 'An error occurred. Please try again';
};

export const mapAuthError = (error: any): string => {
  if (error.message?.includes('Invalid login credentials')) return 'Invalid email or password';
  if (error.message?.includes('Email not confirmed')) return 'Please confirm your email address';
  if (error.message?.includes('User already registered')) return 'An account with this email already exists';
  if (error.message?.includes('Password')) return 'Password does not meet requirements';
  
  return 'Authentication failed. Please try again';
};

export const mapStorageError = (error: any): string => {
  if (error.message?.includes('file size')) return 'File is too large';
  if (error.message?.includes('file type')) return 'Invalid file type';
  if (error.message?.includes('not found')) return 'File not found';
  if (error.message?.includes('permission')) return 'You do not have permission to access this file';
  
  return 'File operation failed. Please try again';
};

export const validatePassword = (password: string): { valid: boolean; error?: string } => {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one symbol (!@#$%^&* etc.)' };
  }
  
  return { valid: true };
};
