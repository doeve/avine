import { Logo } from '@avine/ui';
import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center justify-center text-center">
          <Logo size={48} className="mb-4" />
          <h2 className="text-2xl font-bold tracking-tight">Audio Intelligence</h2>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
