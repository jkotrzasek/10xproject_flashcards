import { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface NavigationProps {
  currentPath?: string;
}

export default function Navigation({ currentPath }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false);

  const links = [
    { href: '/', label: 'Widok Decków' },
    { href: '/generator', label: 'Generator AI' },
    { href: '/manual', label: 'Dodawanie manualne' },
    { href: '/auth/login', label: 'Zaloguj' },
  ];

  const isActive = (href: string) => currentPath === href;

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
            </div>
          </div>
        )}
      </div>
    </>
  );
}

