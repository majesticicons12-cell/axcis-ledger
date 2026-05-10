import { useNavigate } from "react-router-dom";
import { ArrowLeft, Settings } from "lucide-react";
import { ReactNode } from "react";

interface Props {
  title: string;
  back?: boolean;
  right?: ReactNode;
  onSettings?: () => void;
}

const MobileHeader = ({ title, back = true, right, onSettings }: Props) => {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-border/40 bg-background/90 px-3 backdrop-blur-xl pt-safe">
      <div className="flex items-center gap-2">
        {back ? (
          <button
            onClick={() => navigate(-1)}
            className="grid h-9 w-9 place-items-center rounded-full text-foreground/80 transition-smooth active:bg-secondary"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : (
          <div className="w-1" />
        )}
        <h1 className="text-base font-semibold">{title}</h1>
      </div>
      <div className="flex items-center gap-1">
        {right}
        {onSettings && (
          <button
            onClick={onSettings}
            className="grid h-9 w-9 place-items-center rounded-full text-foreground/80 transition-smooth active:bg-secondary"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        )}
      </div>
    </header>
  );
};

export default MobileHeader;
