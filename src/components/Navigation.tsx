import { useState } from 'react';
import { Menu, X, LogOut } from 'lucide-react';

interface NavigationProps {
  currentPath?: string;
  isAuthenticated?: boolean;
  userEmail?: string;
}

export default function Navigation({ currentPath, isAuthenticated = false, userEmail }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const links = [
    { href: '/', label: 'Widok Decków' },
    { href: '/generator', label: 'Generator AI' },
    { href: '/manual', label: 'Dodawanie manualne' },
  ];

  const isActive = (href: string) => currentPath === href;

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (response.ok) {
        // Redirect to login page after successful logout
        window.location.href = '/auth/login';
      } else {
        console.error('Logout failed');
        setIsLoggingOut(false);
      }
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-2">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className={`
              px-6 py-2 rounded-md transition-colors font-medium text-center
              min-w-[180px] whitespace-nowrap
              ${
                isActive(link.href)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-primary/90 text-primary-foreground hover:bg-primary'
              }
            `}
          >
            {link.label}
          </a>
        ))}
        
        {/* Logout button - only visible when authenticated */}
        {/* Separated from main navigation to prevent accidental clicks */}
        {isAuthenticated && (
          <>
            <div className="h-8 w-px bg-border mx-2" aria-hidden="true" />
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="
                px-4 py-2 rounded-md transition-colors text-sm font-medium
                bg-destructive/90 text-destructive-foreground hover:bg-destructive
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center gap-2
              "
              title={userEmail}
            >
              <LogOut className="h-4 w-4" />
              {isLoggingOut ? 'Wylogowywanie...' : 'Wyloguj'}
            </button>
          </>
        )}
      </nav>

      {/* Mobile Navigation */}
      <div className="md:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-md hover:bg-accent transition-colors"
          aria-label="Toggle menu"
          aria-expanded={isOpen}
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>

        {/* Mobile Menu Dropdown */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-background border-b shadow-lg z-50">
            <div className="container mx-auto px-4 py-4 flex flex-col gap-2">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={`
                    px-6 py-3 rounded-md transition-colors font-medium text-center
                    ${
                      isActive(link.href)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-primary/90 text-primary-foreground hover:bg-primary'
                    }
                  `}
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              
              {/* Logout button - mobile - only visible when authenticated */}
              {/* Separated with border to prevent accidental clicks */}
              {isAuthenticated && (
                <>
                  <div className="border-t my-2" aria-hidden="true" />
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      handleLogout();
                    }}
                    disabled={isLoggingOut}
                    className="
                      px-4 py-2 rounded-md transition-colors text-sm font-medium
                      bg-destructive/90 text-destructive-foreground hover:bg-destructive
                      disabled:opacity-50 disabled:cursor-not-allowed
                      flex items-center justify-center gap-2
                    "
                    title={userEmail}
                  >
                    <LogOut className="h-4 w-4" />
                    {isLoggingOut ? 'Wylogowywanie...' : 'Wyloguj'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

