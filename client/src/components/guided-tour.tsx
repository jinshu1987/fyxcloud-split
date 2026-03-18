import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, ChevronLeft, Sparkles, LayoutDashboard, Database, Shield, ShieldAlert, CloudCog, AlertTriangle, Scale, Network, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TourStep {
  target: string;
  title: string;
  description: string;
  icon: any;
  position: "bottom" | "right" | "left" | "top";
  fallbackPosition?: { top: number; left: number };
}

const TOUR_STEPS: TourStep[] = [
  {
    target: "[data-testid='nav-overview']",
    title: "Dashboard Overview",
    description: "Your security command center. Monitor AI model posture, active findings, risk trends, and compliance scores at a glance.",
    icon: LayoutDashboard,
    position: "right",
  },
  {
    target: "[data-testid='nav-inventory']",
    title: "Asset Inventory",
    description: "Discover and track all AI assets across 14 categories — models, endpoints, agents, data stores, IAM roles, and more.",
    icon: Database,
    position: "right",
  },
  {
    target: "[data-testid='nav-security-graph']",
    title: "Security Graph",
    description: "Visualize your cloud environment as an interactive graph. See how assets connect and identify risky relationships.",
    icon: Network,
    position: "right",
  },
  {
    target: "[data-testid='nav-policies']",
    title: "Detection Policies",
    description: "110 built-in detection policies across 12 categories. Enable or disable policies and run evaluations to detect security risks.",
    icon: ShieldAlert,
    position: "right",
  },
  {
    target: "[data-testid='nav-findings']",
    title: "Security Findings",
    description: "Review, triage, and remediate security findings. Each finding includes impact analysis, evidence, and automated remediation scripts.",
    icon: AlertTriangle,
    position: "right",
  },
  {
    target: "[data-testid='nav-compliance']",
    title: "Compliance Dashboard",
    description: "Track compliance across 5 frameworks — EU AI Act, NIST AI RMF, ISO 42001, SOC 2, and OWASP LLM Top 10.",
    icon: Scale,
    position: "right",
  },
  {
    target: "[data-testid='nav-connectors']",
    title: "Cloud Connectors",
    description: "Connect your AWS, Azure, GCP, or Hugging Face accounts to automatically discover AI assets. Credentials are encrypted with AES-256-GCM.",
    icon: CloudCog,
    position: "right",
  },
  {
    target: "[data-testid='nav-reports']",
    title: "Reports",
    description: "Generate executive summaries, compliance reports, and detailed asset inventories for stakeholders.",
    icon: FileText,
    position: "right",
  },
  {
    target: "[data-testid='button-theme-toggle']",
    title: "Theme Switcher",
    description: "Toggle between Sapphire Future dark theme and Clean Future light theme for your preferred viewing experience.",
    icon: Sparkles,
    position: "bottom",
  },
  {
    target: "[data-testid='button-user-menu']",
    title: "Your Profile",
    description: "Access your profile, configure MFA, manage settings, and sign out. You're all set to secure your AI workloads!",
    icon: Shield,
    position: "bottom",
  },
];

const TOUR_STORAGE_KEY = "fyx-cloud-tour-completed";

function getTooltipCoords(rect: DOMRect, position: string, tooltipW: number, tooltipH: number) {
  const gap = 16;
  let top = 0;
  let left = 0;

  switch (position) {
    case "right":
      top = rect.top + rect.height / 2 - tooltipH / 2;
      left = rect.right + gap;
      break;
    case "left":
      top = rect.top + rect.height / 2 - tooltipH / 2;
      left = rect.left - tooltipW - gap;
      break;
    case "bottom":
      top = rect.bottom + gap;
      left = rect.left + rect.width / 2 - tooltipW / 2;
      break;
    case "top":
      top = rect.top - tooltipH - gap;
      left = rect.left + rect.width / 2 - tooltipW / 2;
      break;
  }

  top = Math.max(12, Math.min(top, window.innerHeight - tooltipH - 12));
  left = Math.max(12, Math.min(left, window.innerWidth - tooltipW - 12));

  return { top, left };
}

export function useTour() {
  const [isActive, setIsActive] = useState(false);

  const startTour = useCallback(() => setIsActive(true), []);
  const endTour = useCallback(() => {
    setIsActive(false);
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
  }, []);

  const shouldAutoStart = useCallback(() => {
    return !localStorage.getItem(TOUR_STORAGE_KEY);
  }, []);

  return { isActive, startTour, endTour, shouldAutoStart };
}

export function GuidedTour({ isActive, onEnd }: { isActive: boolean; onEnd: () => void }) {
  const [step, setStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const currentStep = TOUR_STEPS[step];
  const totalSteps = TOUR_STEPS.length;

  const updatePosition = useCallback(() => {
    if (!currentStep) return;
    const el = document.querySelector(currentStep.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      setSpotlightRect(rect);

      const tooltipW = 340;
      const tooltipH = 220;
      const coords = getTooltipCoords(rect, currentStep.position, tooltipW, tooltipH);
      setTooltipPos(coords);
    } else {
      setSpotlightRect(null);
      setTooltipPos({ top: window.innerHeight / 2 - 110, left: window.innerWidth / 2 - 170 });
    }
  }, [currentStep]);

  useEffect(() => {
    if (!isActive) return;
    setStep(0);
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;
    updatePosition();
    const id = setInterval(updatePosition, 300);
    window.addEventListener("resize", updatePosition);
    return () => {
      clearInterval(id);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isActive, updatePosition]);

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      onEnd();
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSkip = () => {
    onEnd();
  };

  if (!isActive) return null;

  const StepIcon = currentStep.icon;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999]" data-testid="guided-tour-overlay">
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "auto" }}>
          <defs>
            <mask id="tour-spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {spotlightRect && (
                <rect
                  x={spotlightRect.left - 6}
                  y={spotlightRect.top - 6}
                  width={spotlightRect.width + 12}
                  height={spotlightRect.height + 12}
                  rx="10"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0" y="0" width="100%" height="100%"
            fill="rgba(0,0,0,0.6)"
            mask="url(#tour-spotlight-mask)"
            onClick={handleSkip}
          />
        </svg>

        {spotlightRect && (
          <div
            className="absolute pointer-events-none rounded-xl ring-2 ring-[#007aff] ring-offset-2 ring-offset-transparent"
            style={{
              top: spotlightRect.top - 6,
              left: spotlightRect.left - 6,
              width: spotlightRect.width + 12,
              height: spotlightRect.height + 12,
              boxShadow: "0 0 0 4px rgba(59,130,246,0.2), 0 0 30px rgba(59,130,246,0.15)",
            }}
          />
        )}

        <motion.div
          ref={tooltipRef}
          key={step}
          initial={{ opacity: 0, scale: 0.92, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="absolute z-10 w-[340px]"
          style={{ top: tooltipPos.top, left: tooltipPos.left }}
          data-testid="guided-tour-tooltip"
        >
          <div className="bg-card/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl shadow-black/30 overflow-hidden">
            <div className="bg-gradient-to-r from-[#007aff]/15 via-[#007aff]/5 to-transparent p-4 pb-3 border-b border-border/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#007aff]/10 border border-[#007aff]/20">
                    <StepIcon className="h-4.5 w-4.5 text-[#007aff]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{currentStep.title}</h3>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      Step {step + 1} of {totalSteps}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  onClick={handleSkip}
                  data-testid="button-tour-close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {currentStep.description}
              </p>
            </div>

            <div className="px-4 pb-4 flex items-center justify-between">
              <div className="flex gap-1">
                {TOUR_STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === step ? "w-5 bg-[#007aff]" : i < step ? "w-1.5 bg-[#007aff]/40" : "w-1.5 bg-muted-foreground/20"
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                {step > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
                    onClick={handlePrev}
                    data-testid="button-tour-prev"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                    Back
                  </Button>
                )}
                {step === 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
                    onClick={handleSkip}
                    data-testid="button-tour-skip"
                  >
                    Skip Tour
                  </Button>
                )}
                <Button
                  size="sm"
                  className="h-8 px-4 text-xs bg-[#007aff] hover:bg-[#007aff]/90 text-white shadow-lg shadow-[#007aff]/20"
                  onClick={handleNext}
                  data-testid="button-tour-next"
                >
                  {step === totalSteps - 1 ? "Finish" : "Next"}
                  {step < totalSteps - 1 && <ChevronRight className="h-3.5 w-3.5 ml-1" />}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
