import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook to restore scroll position when navigating back/forward
 * Uses sessionStorage to persist scroll positions per route
 */
export default function useScrollRestoration() {
  const location = useLocation();

  useEffect(() => {
    // Restore scroll position for current route
    const scrollKey = `scroll:${location.pathname}${location.search}`;
    const savedPosition = sessionStorage.getItem(scrollKey);
    
    if (savedPosition) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        window.scrollTo({
          top: Number(savedPosition),
          behavior: 'auto', // Instant scroll, not smooth
        });
      });
    } else {
      // If no saved position, scroll to top
      window.scrollTo({ top: 0, behavior: 'auto' });
    }

    // Save scroll position before leaving
    const saveScrollPosition = () => {
      const scrollKey = `scroll:${location.pathname}${location.search}`;
      sessionStorage.setItem(scrollKey, String(window.scrollY || 0));
    };

    // Save on scroll (throttled)
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(saveScrollPosition, 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('beforeunload', saveScrollPosition);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeunload', saveScrollPosition);
      clearTimeout(scrollTimeout);
      // Save position on cleanup (route change)
      saveScrollPosition();
    };
  }, [location.pathname, location.search]);
}

