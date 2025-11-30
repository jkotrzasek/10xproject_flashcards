import AuthForm from "./AuthForm";

type AuthMode = "login" | "register";

interface AuthViewProps {
  mode: AuthMode;
}

export default function AuthView({ mode }: AuthViewProps) {
  const isLogin = mode === "login";

  const title = isLogin ? "Zaloguj się" : "Załóż konto";
  const description = isLogin
    ? "Zaloguj się do swojego konta, aby uzyskać dostęp do swoich decków i fiszek."
    : "Załóż konto, aby zapisywać swoje decki i fiszki w chmurze.";
  const switchLinkText = isLogin
    ? "Nie masz konta? Zarejestruj się"
    : "Masz już konto? Zaloguj się";
  const switchLinkHref = isLogin ? "/auth/register" : "/auth/login";

  return (
    <main className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[calc(100vh-5rem)]">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-3">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>

        <div className="bg-card border rounded-lg p-6 shadow-sm">
          <AuthForm mode={mode} />

          {/* Miejsce na komunikaty błędów globalnych - puste w tej wersji szkieletowej */}
          <div className="mt-4 min-h-[20px]" aria-live="polite" aria-atomic="true">
            {/* Komunikaty błędów pojawią się tutaj w kolejnych iteracjach */}
          </div>
        </div>

        <div className="mt-6 text-center">
          <a
            href={switchLinkHref}
            className="text-sm text-primary hover:underline transition-colors"
          >
            {switchLinkText}
          </a>
        </div>
      </div>
    </main>
  );
}

