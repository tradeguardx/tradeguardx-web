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
    // 'instant' because html sets scroll-behavior:smooth — without it this is
    // an animation running while the outgoing route unmounts, and it loses,
    // leaving the new page opened wherever the last one was scrolled to.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, hash]);

  return null;
}

