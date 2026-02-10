import { cn } from "@/lib/utils";

interface OnboardingStepsProps {
  currentStep: "workspace" | "invite";
}

const steps = [
  { key: "workspace", label: "Create Workspace" },
  { key: "invite", label: "Invite Team" },
] as const;

export function OnboardingSteps({ currentStep }: OnboardingStepsProps) {
  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center justify-center gap-3">
      {steps.map((step, i) => {
        const isActive = step.key === currentStep;
        const isCompleted = i < currentIndex;

        return (
          <div key={step.key} className="flex items-center gap-3">
            {i > 0 && (
              <div
                className={cn(
                  "h-px w-8",
                  isCompleted || isActive
                    ? "bg-foreground"
                    : "bg-muted-foreground/30",
                )}
              />
            )}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                  isActive
                    ? "bg-foreground text-background"
                    : isCompleted
                      ? "bg-foreground text-background"
                      : "bg-muted-foreground/20 text-muted-foreground",
                )}
              >
                {i + 1}
              </div>
              <span
                className={cn(
                  "text-sm",
                  isActive
                    ? "font-medium text-foreground"
                    : isCompleted
                      ? "text-foreground"
                      : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
