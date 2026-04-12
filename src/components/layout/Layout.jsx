import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import ReadingProgress from '../common/ReadingProgress';

export default function Layout() {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');

  return (
    <div className="min-h-screen flex flex-col bg-surface-950">
      {!isDashboard && <ReadingProgress />}
      {!isDashboard && <Navbar />}
      <main className={isDashboard ? 'flex-1' : 'flex-1'}>
        <Outlet />
      </main>
      {!isDashboard && <Footer />}
    </div>
  );
}
