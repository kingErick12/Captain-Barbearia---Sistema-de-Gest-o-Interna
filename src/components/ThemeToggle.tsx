import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '../lib/utils';

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem('captain_theme');
    if (savedTheme === 'light') return false;
    return true; // Default dark
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('captain_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('captain_theme', 'light');
      }
      return next;
    });
  };

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "fixed z-50 bottom-6 right-6 p-3 rounded-full transition-all shadow-lg active:scale-95",
        "bg-white dark:bg-graphite-light border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-bronze-main dark:hover:text-bronze-main shadow-md"
      )}
      aria-label="Toggle Theme"
    >
      {isDark ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
    </button>
  );
}
