type AuthMode = "login" | "register";

interface AuthFormProps {
  mode: AuthMode;
}

export default function AuthForm({ mode }: AuthFormProps) {
  const isLogin = mode === "login";
  const buttonText = isLogin ? "Zaloguj się" : "Zarejestruj się";

  return (
    <form className="space-y-4" onSubmit={() => {}}>
      {/* Pole E-mail */}
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-foreground">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          placeholder="twoj@email.com"
          className="w-full px-3 py-2 bg-muted border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Pole Hasło */}
      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium text-foreground">
          Hasło
        </label>
        <input
          id="password"
          type="password"
          placeholder="••••••••"
          className="w-full px-3 py-2 bg-muted border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Pole Potwierdź hasło - tylko dla rejestracji */}
      {!isLogin && (
        <div className="space-y-2">
          <label htmlFor="password-confirm" className="block text-sm font-medium text-foreground">
            Potwierdź hasło
          </label>
          <input
            id="password-confirm"
            type="password"
            placeholder="••••••••"
            className="w-full px-3 py-2 bg-muted border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      )}

      {/* Opis pomocniczy - statyczny tekst */}
      <p className="text-xs text-muted-foreground">
        {isLogin ? "Wprowadź swoje dane logowania." : "Hasło musi mieć minimum 8 znaków."}
      </p>

      {/* Przycisk wysyłki - nieaktywny */}
      <button
        type="submit"
        className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium opacity-60 cursor-pointer"
      >
        {buttonText}
      </button>
    </form>
  );
}
