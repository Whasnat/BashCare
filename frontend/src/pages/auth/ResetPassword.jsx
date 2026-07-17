import { Navigate } from 'react-router-dom';

/**
 * Placeholder — ResetPassword requires a token-based email flow.
 * For now, redirect to forgot-password which explains the admin flow.
 */
export default function ResetPassword() {
  return <Navigate to="/forgot-password" replace />;
}
