import { NavLink } from "react-router-dom";
import { Home, MessageSquare, Wrench, User } from "lucide-react";

const tabs = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/chat", label: "AI Assistant", icon: MessageSquare },
  { to: "/tools", label: "Tools", icon: Wrench },
  { to: "/profile", label: "Profile", icon: User },
];

const BottomNav = () => {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[480px] border-t border-border/60 bg-background/95 backdrop-blur-xl pb-safe"
      aria-label="Primary"
    >
      <ul className="grid grid-cols-4 px-1 pt-1.5">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <li key={t.to}>
              <NavLink
                to={t.to}
                end={t.to === "/dashboard"}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition-smooth ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`h-5 w-5 ${isActive ? "stroke-[2.5]" : "stroke-2"}`}
                      aria-hidden
                    />
                    <span className="leading-none">{t.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default BottomNav;
