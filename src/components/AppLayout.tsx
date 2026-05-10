import { ReactNode } from "react";
import BottomNav from "./BottomNav";

interface AppLayoutProps {
  children: ReactNode;
  hideNav?: boolean;
}

const AppLayout = ({ children, hideNav = false }: AppLayoutProps) => {
  return (
    <div className="app-shell">
      <div className={hideNav ? "" : "pb-nav"}>{children}</div>
      {!hideNav && <BottomNav />}
    </div>
  );
};

export default AppLayout;
