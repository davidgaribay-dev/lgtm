"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FilePlus, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTestRepoStore } from "@/lib/stores/test-repo-store";

interface TestRepoCreateCaseProps {
  projectId: string;
  parentId: string | null;
  parentType: "suite" | "section" | "root";
  suites: { id: string; name: string }[];
  sections: {
    id: string;
    name: string;
    suiteId: string | null;
    parentId: string | null;
  }[];
}

export function TestRepoCreateCase({
  projectId,
  parentId,
  parentType,
  suites,
  sections,
}: TestRepoCreateCaseProps) {
  const router = useRouter();
  const setCreatingTestCase = useTestRepoStore((s) => s.setCreatingTestCase);
  const selectNode = useTestRepoStore((s) => s.selectNode);
  const titleRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [preconditions, setPreconditions] = useState("");
  const [priority, setPriority] = useState("medium");
  const [type, setType] = useState("functional");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => titleRef.current?.focus());
  }, []);

  // Build breadcrumb from parent context
  const parentSection =
    parentType === "section"
      ? sections.find((s) => s.id === parentId)
      : null;
  const parentSuite =
    parentType === "suite"
      ? suites.find((s) => s.id === parentId)
      : parentSection?.suiteId
        ? suites.find((s) => s.id === parentSection.suiteId)
        : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setIsPending(true);
    setError("");

    try {
      const sectionId =
        parentType === "section" ? parentId : null;

      const res = await fetch("/api/test-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          preconditions: preconditions.trim() || null,
          priority,
          type,
          sectionId,
          projectId,
        }),
      });

      if (!res.ok) throw new Error("Failed to create test case");

      const created = await res.json();
      setCreatingTestCase(null);
      selectNode({ id: created.id, type: "testCase" });
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="px-8 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <FilePlus className="h-3.5 w-3.5" />
        <span>New Test Case</span>
        {parentSuite && (
          <>
            <ChevronRight className="h-3 w-3" />
            <span>{parentSuite.name}</span>
          </>
        )}
        {parentSection && (
          <>
            <ChevronRight className="h-3 w-3" />
            <span>{parentSection.name}</span>
          </>
        )}
      </div>

      {/* Title */}
      <h1 className="mt-2 text-xl font-semibold tracking-tight">
        Create Test Case
      </h1>

      <Separator className="my-4" />

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Title field */}
        <div className="space-y-2">
          <Label htmlFor="tc-title">Title</Label>
          <Input
            ref={titleRef}
            id="tc-title"
            placeholder="e.g. User can log in with valid credentials"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setError("");
            }}
            disabled={isPending}
            required
          />
        </div>

        {/* Priority & Type side by side */}
        <div className="flex gap-4">
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority} disabled={isPending}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType} disabled={isPending}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="functional">Functional</SelectItem>
                <SelectItem value="smoke">Smoke</SelectItem>
                <SelectItem value="regression">Regression</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="usability">Usability</SelectItem>
                <SelectItem value="performance">Performance</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="tc-description">Description</Label>
          <Textarea
            id="tc-description"
            placeholder="Describe what this test case verifies..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isPending}
            rows={3}
          />
        </div>

        {/* Preconditions */}
        <div className="space-y-2">
          <Label htmlFor="tc-preconditions">Preconditions</Label>
          <Textarea
            id="tc-preconditions"
            placeholder="Any setup or prerequisites required..."
            value={preconditions}
            onChange={(e) => setPreconditions(e.target.value)}
            disabled={isPending}
            rows={2}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCreatingTestCase(null)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending || !title.trim()}>
            {isPending && <Loader2 className="animate-spin" />}
            Create Test Case
          </Button>
        </div>
      </form>
    </div>
  );
}
