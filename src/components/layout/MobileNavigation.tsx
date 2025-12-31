import { useLocation, useNavigate } from "react-router-dom";
import { Home, Users, MessageCircle, UserPlus, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: Home, label: "Feed", path: "/feed" },
  { icon: Users, label: "Members", path: "/members" },
  { icon: MessageCircle, label: "Messages", path: "/messages" },
  { icon: UserPlus, label: "Connect", path: "/connections" },
  { icon: User, label: "Profile", path: "/profile" },
];

export function MobileNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === "/feed") {
      return location.pathname === "/feed" || location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                "active:scale-95 touch-manipulation",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", active && "stroke-[2.5px]")} />
              <span className={cn("text-[10px]", active && "font-medium")}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
