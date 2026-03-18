import { HelpCircle } from "lucide-react";
import { useLocation } from "wouter";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function HelpIcon({ section }: { section: string }) {
  const [, setLocation] = useLocation();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          data-testid={`help-icon-${section}`}
          onClick={() => setLocation(`/docs#${section}`)}
          className="inline-flex items-center justify-center h-6 w-6 rounded-md text-muted-foreground hover:text-[#007aff] hover:bg-[#007aff]/10 transition-colors"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>View documentation</p>
      </TooltipContent>
    </Tooltip>
  );
}
