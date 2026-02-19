'use client';

import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import React, { useCallback, useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const STYLE_ID = 'theme-transition-styles';

const createCircleAnimation = (blur = false) => ({
  name: 'circle-center',
  css: `
    ::view-transition-group(root) {
      animation-duration: 0.6s;
      animation-timing-function: cubic-bezier(0.19, 1, 0.22, 1);
    }
    ::view-transition-new(root) {
      animation-name: reveal-light${blur ? '-blur' : ''};
      ${blur ? 'filter: blur(2px);' : ''}
    }
    ::view-transition-old(root),
    .dark::view-transition-old(root) {
      animation: none;
      z-index: -1;
    }
    .dark::view-transition-new(root) {
      animation-name: reveal-dark${blur ? '-blur' : ''};
      ${blur ? 'filter: blur(2px);' : ''}
    }
    @keyframes reveal-dark${blur ? '-blur' : ''} {
      from {
        clip-path: circle(0% at 50% 50%);
        ${blur ? 'filter: blur(8px);' : ''}
      }
      ${blur ? '50% { filter: blur(4px); }' : ''}
      to {
        clip-path: circle(150% at 50% 50%);
        ${blur ? 'filter: blur(0px);' : ''}
      }
    }
    @keyframes reveal-light${blur ? '-blur' : ''} {
      from {
        clip-path: circle(0% at 50% 50%);
        ${blur ? 'filter: blur(8px);' : ''}
      }
      ${blur ? '50% { filter: blur(4px); }' : ''}
      to {
        clip-path: circle(150% at 50% 50%);
        ${blur ? 'filter: blur(0px);' : ''}
      }
    }
  `,
});

function updateStyles(css: string) {
  if (typeof window === 'undefined') return;
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = css;
}

export function useThemeToggle(options?: { blur?: boolean }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(resolvedTheme === 'dark');
  }, [resolvedTheme]);

  const toggleTheme = useCallback(() => {
    const animation = createCircleAnimation(options?.blur ?? false);
    updateStyles(animation.css);

    const switchTheme = () => {
      setTheme(theme === 'light' ? 'dark' : 'light');
    };

    if (typeof window === 'undefined') {
      switchTheme();
      return;
    }

    if (document.startViewTransition) {
      document.startViewTransition(switchTheme);
    } else {
      switchTheme();
    }
  }, [theme, setTheme, options?.blur]);

  return { isDark, toggleTheme };
}

export function ThemeToggle({
  className = '',
  variant = 'switch',
}: {
  className?: string;
  variant?: 'switch' | 'icon';
}) {
  const { isDark, toggleTheme } = useThemeToggle({ blur: true });

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Toggle theme"
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-300',
          'border border-slate-700/40 dark:border-slate-600/50',
          'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-700/50',
          'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
          'active:scale-95',
          className
        )}
      >
        <span className="sr-only">Toggle theme</span>
        {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </button>
    );
  }

  // Switch variant - pill toggle with sliding thumb
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className={cn(
        'relative flex h-8 w-14 shrink-0 items-center rounded-full transition-colors duration-300',
        'border',
        isDark
          ? 'border-slate-600/50 bg-slate-800'
          : 'border-slate-300 bg-slate-200',
        'active:scale-[0.98]',
        className
      )}
    >
      <span
        className={cn(
          'absolute flex h-6 w-6 items-center justify-center rounded-full shadow-md transition-all duration-300 ease-out',
          isDark
            ? 'left-1 bg-slate-700 text-amber-300'
            : 'left-1 bg-white text-amber-500'
        )}
        style={{ transform: isDark ? 'translateX(24px)' : 'translateX(0)' }}
      >
        {isDark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
      </span>
    </button>
  );
}
