import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut } from "lucide-react";
import { useAuthApi } from "./hooks/useAuthApi";
import { toast } from "sonner";

interface UserMenuProps {
  userEmail: string;
}

/**
 * User menu component - shows user email and logout button
 * To be integrated with AppLayout when auth middleware is ready
 */
export function UserMenu({ userEmail }: UserMenuProps) {
  const { logout, isLoading } = useAuthApi();

  const handleLogout = async () => {
    const result = await logout();

    if (result) {
      // Success - redirect to login
      toast.success("Wylogowano pomyślnie");
      setTimeout(() => {
        window.location.href = "/auth/login";
      }, 500);
    } else {
      toast.error("Nie udało się wylogować");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <User className="h-4 w-4" />
          <span className="hidden md:inline">{userEmail}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Moje konto</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="text-xs text-muted-foreground">
          {userEmail}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          disabled={isLoading}
          className="text-destructive focus:text-destructive cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{isLoading ? "Wylogowywanie..." : "Wyloguj się"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
