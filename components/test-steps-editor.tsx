"use client";

import { useState, useCallback } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export interface TestStep {
  id: string;
  stepOrder: number;
  action: string;
  data: string | null;
  expectedResult: string | null;
}

interface TestStepsEditorProps {
  steps: TestStep[];
  onChange: (steps: TestStep[]) => void;
  disabled?: boolean;
}

export function TestStepsEditor({
  steps,
  onChange,
  disabled = false,
}: TestStepsEditorProps) {
  const [localSteps, setLocalSteps] = useState(steps);

  const handleAddStep = useCallback(() => {
    const newStep: TestStep = {
      id: `temp-${Date.now()}`,
      stepOrder: localSteps.length,
      action: "",
      data: null,
      expectedResult: null,
    };
    const updated = [...localSteps, newStep];
    setLocalSteps(updated);
    onChange(updated);
  }, [localSteps, onChange]);

  const handleUpdateStep = useCallback(
    (index: number, field: "action" | "data" | "expectedResult", value: string) => {
      const updated = [...localSteps];
      updated[index] = {
        ...updated[index],
        [field]: value || null,
      };
      setLocalSteps(updated);
      onChange(updated);
    },
    [localSteps, onChange],
  );

  const handleDeleteStep = useCallback(
    (index: number) => {
      const updated = localSteps.filter((_, i) => i !== index);
      // Reorder remaining steps
      const reordered = updated.map((step, i) => ({
        ...step,
        stepOrder: i,
      }));
      setLocalSteps(reordered);
      onChange(reordered);
    },
    [localSteps, onChange],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm text-muted-foreground">Test Steps</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleAddStep}
          disabled={disabled}
          className="h-8 gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Step
        </Button>
      </div>

      {localSteps.length === 0 ? (
        <div className="rounded-lg border border-dashed px-6 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No steps added yet. Click "Add Step" to create your first step.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          {/* Table header */}
          <div className="grid grid-cols-[40px_1fr_1fr_1fr_40px] gap-3 border-b bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground">
            <div></div>
            <div>Action</div>
            <div>Test Data</div>
            <div>Expected Result</div>
            <div></div>
          </div>

          {/* Table rows */}
          {localSteps.map((step, index) => (
            <div
              key={step.id}
              className="group grid grid-cols-[40px_1fr_1fr_1fr_40px] gap-3 border-b px-3 py-3 last:border-b-0 hover:bg-muted/20"
            >
              {/* Drag handle */}
              <div className="flex items-start pt-1">
                <button
                  type="button"
                  className="cursor-grab text-muted-foreground/50 transition-colors hover:text-muted-foreground"
                  disabled={disabled}
                >
                  <GripVertical className="h-4 w-4" />
                </button>
              </div>

              {/* Action */}
              <div>
                <Textarea
                  placeholder="e.g., Navigate to login page"
                  value={step.action}
                  onChange={(e) =>
                    handleUpdateStep(index, "action", e.target.value)
                  }
                  disabled={disabled}
                  rows={2}
                  className="min-h-[60px] resize-none text-sm"
                />
              </div>

              {/* Test Data */}
              <div>
                <Textarea
                  placeholder="e.g., username@example.com"
                  value={step.data || ""}
                  onChange={(e) =>
                    handleUpdateStep(index, "data", e.target.value)
                  }
                  disabled={disabled}
                  rows={2}
                  className="min-h-[60px] resize-none text-sm"
                />
              </div>

              {/* Expected Result */}
              <div>
                <Textarea
                  placeholder="e.g., Login page displayed"
                  value={step.expectedResult || ""}
                  onChange={(e) =>
                    handleUpdateStep(index, "expectedResult", e.target.value)
                  }
                  disabled={disabled}
                  rows={2}
                  className="min-h-[60px] resize-none text-sm"
                />
              </div>

              {/* Delete button */}
              <div className="flex items-start pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteStep(index)}
                  disabled={disabled}
                  className="h-5 w-5 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
