"use client";

import { useState, useCallback, useRef } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useDrag, useDrop } from "react-dnd";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const STEP_DND_TYPE = "TEST_STEP";

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
  // Edit-mode callbacks for auto-save (when editing existing test cases)
  onStepSave?: (step: TestStep) => Promise<void>;
  onStepCreate?: (step: TestStep) => Promise<TestStep>;
  onStepDelete?: (stepId: string) => Promise<void>;
  onStepsReorder?: (stepIds: string[]) => Promise<void>;
}

export function TestStepsEditor({
  steps,
  onChange,
  disabled = false,
  onStepSave,
  onStepCreate,
  onStepDelete,
  onStepsReorder,
}: TestStepsEditorProps) {
  const [localSteps, setLocalSteps] = useState(steps);
  const savingRef = useRef<Set<string>>(new Set());

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
    async (index: number) => {
      const step = localSteps[index];
      const updated = localSteps.filter((_, i) => i !== index);
      const reordered = updated.map((s, i) => ({
        ...s,
        stepOrder: i,
      }));
      setLocalSteps(reordered);
      onChange(reordered);

      // Persist deletion for existing steps
      if (onStepDelete && !step.id.startsWith("temp-")) {
        await onStepDelete(step.id);
      }
    },
    [localSteps, onChange, onStepDelete],
  );

  const moveStep = useCallback(
    (dragIndex: number, hoverIndex: number) => {
      setLocalSteps((prev) => {
        const updated = [...prev];
        const [removed] = updated.splice(dragIndex, 1);
        updated.splice(hoverIndex, 0, removed);
        return updated.map((s, i) => ({ ...s, stepOrder: i }));
      });
    },
    [],
  );

  const handleDrop = useCallback(() => {
    const current = localSteps;
    onChange(current);
    if (onStepsReorder) {
      const nonTempSteps = current.filter((s) => !s.id.startsWith("temp-"));
      if (nonTempSteps.length > 0) {
        onStepsReorder(current.map((s) => s.id));
      }
    }
  }, [localSteps, onChange, onStepsReorder]);

  const handleStepBlur = useCallback(
    async (index: number) => {
      const step = localSteps[index];
      if (!step || savingRef.current.has(step.id)) return;

      const isTemp = step.id.startsWith("temp-");

      if (isTemp && onStepCreate && step.action.trim()) {
        // Persist new step
        savingRef.current.add(step.id);
        try {
          const created = await onStepCreate(step);
          let updated: TestStep[] = [];
          setLocalSteps((prev) => {
            updated = [...prev];
            const idx = updated.findIndex((s) => s.id === step.id);
            if (idx !== -1) {
              updated[idx] = { ...updated[idx], id: created.id };
            }
            return updated;
          });
          onChange(updated);
        } finally {
          savingRef.current.delete(step.id);
        }
      } else if (!isTemp && onStepSave) {
        // Update existing step
        savingRef.current.add(step.id);
        try {
          await onStepSave(step);
        } finally {
          savingRef.current.delete(step.id);
        }
      }
    },
    [localSteps, onStepCreate, onStepSave, onChange],
  );

  return (
    <>
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
              No steps added yet. Click &quot;Add Step&quot; to create your first step.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border bg-card">
            {/* Table header */}
            <div className="grid grid-cols-[40px_1fr_1fr_1fr_40px] gap-3 border-b px-3 py-2 text-xs font-medium text-muted-foreground">
              <div></div>
              <div>Action</div>
              <div>Test Data</div>
              <div>Expected Result</div>
              <div></div>
            </div>

            {/* Table rows */}
            {localSteps.map((step, index) => (
              <DraggableStepRow
                key={step.id}
                step={step}
                index={index}
                disabled={disabled}
                onUpdateStep={handleUpdateStep}
                onBlur={handleStepBlur}
                onDelete={handleDeleteStep}
                moveStep={moveStep}
                onDrop={handleDrop}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function DraggableStepRow({
  step,
  index,
  disabled,
  onUpdateStep,
  onBlur,
  onDelete,
  moveStep,
  onDrop,
}: {
  step: TestStep;
  index: number;
  disabled: boolean;
  onUpdateStep: (index: number, field: "action" | "data" | "expectedResult", value: string) => void;
  onBlur: (index: number) => void;
  onDelete: (index: number) => void;
  moveStep: (dragIndex: number, hoverIndex: number) => void;
  onDrop: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag, preview] = useDrag({
    type: STEP_DND_TYPE,
    item: () => ({ id: step.id, index }),
    canDrag: !disabled,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (_item, monitor) => {
      if (monitor.didDrop()) {
        onDrop();
      }
    },
  });

  const [, drop] = useDrop({
    accept: STEP_DND_TYPE,
    hover: (item: { id: string; index: number }, monitor) => {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;

      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY =
        (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

      moveStep(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  preview(drop(ref));

  return (
    <div
      ref={ref}
      className={cn(
        "group grid grid-cols-[40px_1fr_1fr_1fr_40px] gap-3 border-b px-3 py-3 last:border-b-0 hover:bg-muted/20",
        isDragging && "opacity-40",
      )}
    >
      {/* Drag handle */}
      <div className="flex items-start pt-1">
        <button
          ref={(node) => { drag(node); }}
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
          placeholder=""
          value={step.action}
          onChange={(e) =>
            onUpdateStep(index, "action", e.target.value)
          }
          onBlur={() => onBlur(index)}
          disabled={disabled}
          rows={2}
          className="min-h-[60px] resize-none border-0 text-sm shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
      </div>

      {/* Test Data */}
      <div>
        <Textarea
          placeholder=""
          value={step.data || ""}
          onChange={(e) =>
            onUpdateStep(index, "data", e.target.value)
          }
          onBlur={() => onBlur(index)}
          disabled={disabled}
          rows={2}
          className="min-h-[60px] resize-none border-0 text-sm shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
      </div>

      {/* Expected Result */}
      <div>
        <Textarea
          placeholder=""
          value={step.expectedResult || ""}
          onChange={(e) =>
            onUpdateStep(index, "expectedResult", e.target.value)
          }
          onBlur={() => onBlur(index)}
          disabled={disabled}
          rows={2}
          className="min-h-[60px] resize-none border-0 text-sm shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
      </div>

      {/* Delete button */}
      <div className="flex items-start pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onDelete(index)}
          disabled={disabled}
          className="h-5 w-5 p-0 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
