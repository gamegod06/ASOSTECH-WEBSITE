import { useEffect, useState } from 'react';
import AdminDashboard from './AdminDashboard';
import PublicSite from './PublicSite';

export default function App() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  return path === '/admin' || path.startsWith('/admin/')
    ? <AdminDashboard />
    : <PublicSite />;
}
