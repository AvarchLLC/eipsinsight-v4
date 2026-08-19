'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);
  const mainScrollTargetRef = useRef<HTMLElement | Window | null>(null);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target;

      // Ignore scroll events originating inside the sidebar
      if (target instanceof HTMLElement) {
        if (target.closest('[data-sidebar]') || target.closest('aside')) {
          return;
        }
      }

      let scrollTop = 0;
      let scrollTarget: HTMLElement | Window | null = null;

      if (target instanceof HTMLElement) {
        scrollTop = target.scrollTop;
        scrollTarget = target;
      } else if (target === document || target === window) {
        scrollTop = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
        scrollTarget = window;
      }

      // Fallback check on main container
      if (scrollTop === 0) {
        const mainEl = document.querySelector('main');
        const mainParent = mainEl?.closest('.overflow-y-auto') as HTMLElement | null;
        if (mainParent && mainParent.scrollTop > 0) {
          scrollTop = mainParent.scrollTop;
          scrollTarget = mainParent;
        }
      }

      if (scrollTarget) {
        mainScrollTargetRef.current = scrollTarget;
      }

      if (scrollTop > 80) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    // capture: true is mandatory because 'scroll' events on <div> elements do not bubble!
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });

    // Initial check
    const mainEl = document.querySelector('main');
    const mainParent = mainEl?.closest('.overflow-y-auto') as HTMLElement | null;
    if (mainParent && mainParent.scrollTop > 80) {
      setIsVisible(true);
      mainScrollTargetRef.current = mainParent;
    }

    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, []);

  const scrollToTop = () => {
    const target = mainScrollTargetRef.current;
    if (target && 'scrollTo' in target) {
      target.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }

    // Also scroll main container and window as fallbacks
    const mainEl = document.querySelector('main');
    const mainParent = mainEl?.closest('.overflow-y-auto') as HTMLElement | null;
    if (mainParent) {
      mainParent.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
    if (document.documentElement) {
      document.documentElement.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Scroll to top of page"
      title="Scroll to top"
      className={cn(
        'fixed bottom-16 right-4 z-[9999] flex h-10 w-10 items-center justify-center rounded-full border border-border/80 bg-card/95 text-foreground shadow-xl backdrop-blur-xl transition-all duration-300 sm:bottom-16 sm:right-4 sm:h-10 sm:w-10',
        'hover:border-primary/50 hover:bg-primary hover:text-primary-foreground hover:shadow-primary/20 hover:scale-110',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 active:scale-95',
        isVisible
          ? 'translate-y-0 opacity-100 pointer-events-auto'
          : 'translate-y-4 opacity-0 pointer-events-none'
      )}
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}
