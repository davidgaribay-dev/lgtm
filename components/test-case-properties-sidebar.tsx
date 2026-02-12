"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export interface TeamMember {
  userId: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
}

export interface TestCasePropertyValues {
  status: string;
  priority: string;
  severity: string;
  type: string;
  automationStatus: string;
  behavior: string;
  layer: string;
  isFlaky: boolean;
  assigneeId: string;
}

interface TestCasePropertiesSidebarProps {
  values: TestCasePropertyValues;
  onPropertyChange: (field: string, value: string | boolean | null) => void;
  members: TeamMember[];
  disabled?: boolean;
}

const selectTriggerClassName =
  "h-7 w-auto gap-1.5 border-0 bg-transparent px-2 text-sm shadow-none focus:ring-0 dark:bg-transparent dark:hover:bg-transparent";

export function TestCasePropertiesSidebar({
  values,
  onPropertyChange,
  members,
  disabled = false,
}: TestCasePropertiesSidebarProps) {
  return (
    <div className="w-80 shrink-0 overflow-y-auto border-l bg-card">
      <div className="flex h-11 shrink-0 items-center border-b px-6">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Properties
        </h3>
      </div>
      <div className="px-6 py-2">
        <div>

          <div>
            {/* Status */}
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted-foreground">Status</span>
              <Select
                value={values.status}
                onValueChange={(val) => onPropertyChange("status", val)}
                disabled={disabled}
              >
                <SelectTrigger className={selectTriggerClassName}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="deprecated">Deprecated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted-foreground">Priority</span>
              <Select
                value={values.priority}
                onValueChange={(val) => onPropertyChange("priority", val)}
                disabled={disabled}
              >
                <SelectTrigger className={selectTriggerClassName}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Severity */}
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted-foreground">Severity</span>
              <Select
                value={values.severity}
                onValueChange={(val) => onPropertyChange("severity", val)}
                disabled={disabled}
              >
                <SelectTrigger className={selectTriggerClassName}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="not_set">Not set</SelectItem>
                  <SelectItem value="blocker">Blocker</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="major">Major</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="minor">Minor</SelectItem>
                  <SelectItem value="trivial">Trivial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Type */}
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted-foreground">Type</span>
              <Select
                value={values.type}
                onValueChange={(val) => onPropertyChange("type", val)}
                disabled={disabled}
              >
                <SelectTrigger className={selectTriggerClassName}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="functional">Functional</SelectItem>
                  <SelectItem value="smoke">Smoke</SelectItem>
                  <SelectItem value="regression">Regression</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="usability">Usability</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="acceptance">Acceptance</SelectItem>
                  <SelectItem value="compatibility">Compatibility</SelectItem>
                  <SelectItem value="integration">Integration</SelectItem>
                  <SelectItem value="exploratory">Exploratory</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Automation Status */}
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted-foreground">Automation</span>
              <Select
                value={values.automationStatus}
                onValueChange={(val) => onPropertyChange("automationStatus", val)}
                disabled={disabled}
              >
                <SelectTrigger className={selectTriggerClassName}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="not_automated">Not automated</SelectItem>
                  <SelectItem value="automated">Automated</SelectItem>
                  <SelectItem value="to_be_automated">To be automated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Behavior */}
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted-foreground">Behavior</span>
              <Select
                value={values.behavior}
                onValueChange={(val) => onPropertyChange("behavior", val)}
                disabled={disabled}
              >
                <SelectTrigger className={selectTriggerClassName}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="not_set">Not set</SelectItem>
                  <SelectItem value="positive">Positive</SelectItem>
                  <SelectItem value="negative">Negative</SelectItem>
                  <SelectItem value="destructive">Destructive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Layer */}
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted-foreground">Layer</span>
              <Select
                value={values.layer}
                onValueChange={(val) => onPropertyChange("layer", val)}
                disabled={disabled}
              >
                <SelectTrigger className={selectTriggerClassName}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="not_set">Not set</SelectItem>
                  <SelectItem value="e2e">E2E</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="unit">Unit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Is Flaky */}
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted-foreground">Flaky</span>
              <Switch
                checked={values.isFlaky}
                onCheckedChange={(checked) => onPropertyChange("isFlaky", checked)}
                disabled={disabled}
              />
            </div>

            {/* Assignee */}
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted-foreground">Assignee</span>
              <Select
                value={values.assigneeId}
                onValueChange={(val) =>
                  onPropertyChange("assigneeId", val === "unassigned" ? null : val)
                }
                disabled={disabled}
              >
                <SelectTrigger className={selectTriggerClassName}>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>
                      <span className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          {m.image && <AvatarImage src={m.image} alt={m.name} />}
                          <AvatarFallback className="text-[10px]">
                            {m.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        {m.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
