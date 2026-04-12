import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function scrollToHashTarget(hash) {
  const id = hash?.replace(/^#/, '');
  if (!id) return false;
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return true;
}

export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      if (scrollToHashTarget(hash)) return;
      const t = window.setTimeout(() => scrollToHashTarget(hash), 120);
      return () => clearTimeout(t);
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}

