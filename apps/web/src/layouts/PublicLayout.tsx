import { Outlet } from 'react-router-dom';

/**
 * PublicLayout - Wrapper for unauthenticated public pages
 * Landing page handles its own nav, so this is minimal
 */
export function PublicLayout() {
  return <Outlet />;
}
