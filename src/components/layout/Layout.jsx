import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import ReadingProgress from '../common/ReadingProgress';
import ActivePromo from '../promo/ActivePromo';

export default function Layout() {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');

  return (
    // bg-surface-950 lives on <body> already (index.css). Repeating it here
    // creates an opaque wrapper that paints over the fixed `.landing-bg`
    // scatter layer, hiding the Sentry-style background. Use a transparent
    // wrapper so the fixed layer shows through; body color is the fallback.
    <div className="min-h-screen flex flex-col">
      {!isDashboard && <ActivePromo />}
      {!isDashboard && <ReadingProgress />}
      {!isDashboard && <Navbar />}
      <main className={isDashboard ? 'flex-1' : 'flex-1'}>
        <Outlet />
      </main>
      {!isDashboard && (
        <div className="px-6 pb-2 pt-12">
          <div className="wave-divider mx-auto max-w-7xl" aria-hidden />
        </div>
      )}
      {!isDashboard && <Footer />}
    </div>
  );
}
