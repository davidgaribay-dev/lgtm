"use client";

import { useMemo, useState, useRef, useCallback } from "react";
import { ChevronRight, ChevronDown, Search, X } from "lucide-react";
import Anser from "anser";
import { cn } from "@/lib/utils";

interface LogChunk {
  id: string;
  stepName: string | null;
  content: string;
  lineOffset: number;
  lineCount: number;
}

interface LogViewerProps {
  chunks: LogChunk[];
  className?: string;
}

interface LogLine {
  lineNumber: number;
  html: string;
  raw: string;
  stepName: string | null;
}

interface StepGroup {
  name: string | null;
  lines: LogLine[];
  lineCount: number;
}

function parseChunksToLines(chunks: LogChunk[]): LogLine[] {
  const lines: LogLine[] = [];
  for (const chunk of chunks) {
    const rawLines = chunk.content.split("\n");
    for (let i = 0; i < rawLines.length; i++) {
      const raw = rawLines[i];
      const escaped = Anser.escapeForHtml(raw);
      const html = Anser.ansiToHtml(escaped, { use_classes: true });
      lines.push({
        lineNumber: chunk.lineOffset + i + 1,
        html,
        raw,
        stepName: chunk.stepName,
      });
    }
  }
  return lines;
}

function groupLinesByStep(lines: LogLine[]): StepGroup[] {
  const groups: StepGroup[] = [];
  let currentGroup: StepGroup | null = null;

  for (const line of lines) {
    if (!currentGroup || currentGroup.name !== line.stepName) {
      currentGroup = { name: line.stepName, lines: [], lineCount: 0 };
      groups.push(currentGroup);
    }
    currentGroup.lines.push(line);
    currentGroup.lineCount++;
  }

  return groups;
}

export function LogViewer({ chunks, className }: LogViewerProps) {
  const [collapsedSteps, setCollapsedSteps] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchVisible, setSearchVisible] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const lines = useMemo(() => parseChunksToLines(chunks), [chunks]);
  const stepGroups = useMemo(() => groupLinesByStep(lines), [lines]);

  const matchCount = useMemo(() => {
    if (!searchQuery) return 0;
    const q = searchQuery.toLowerCase();
    return lines.filter((l) => l.raw.toLowerCase().includes(q)).length;
  }, [lines, searchQuery]);

  const toggleStep = useCallback((name: string) => {
    setCollapsedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  const toggleSearch = useCallback(() => {
    setSearchVisible((prev) => {
      if (!prev) {
        setTimeout(() => searchInputRef.current?.focus(), 0);
      } else {
        setSearchQuery("");
      }
      return !prev;
    });
  }, []);

  if (chunks.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted/50 text-sm text-muted-foreground",
          className,
        )}
      >
        No logs available.
      </div>
    );
  }

  const searchLower = searchQuery.toLowerCase();

  return (
    <div className={cn("log-viewer flex flex-col overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex shrink-0 items-center justify-between border-b bg-card px-3 py-1.5">
        <span className="text-xs text-muted-foreground">
          {lines.length} line{lines.length !== 1 ? "s" : ""}
          {stepGroups.filter((g) => g.name).length > 0 && (
            <> &middot; {stepGroups.filter((g) => g.name).length} step{stepGroups.filter((g) => g.name).length !== 1 ? "s" : ""}</>
          )}
        </span>
        <div className="flex items-center gap-2">
          {searchVisible && (
            <div className="flex items-center gap-1.5">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="h-6 w-48 rounded border border-input bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
              />
              {searchQuery && (
                <span className="text-xs tabular-nums text-muted-foreground">
                  {matchCount} match{matchCount !== 1 ? "es" : ""}
                </span>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={toggleSearch}
            className={cn(
              "rounded p-1 transition-colors",
              searchVisible
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {searchVisible ? (
              <X className="h-3.5 w-3.5" />
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Log content */}
      <div className="flex-1 overflow-y-auto bg-muted/30 font-mono text-xs leading-5">
        {stepGroups.map((group, groupIdx) => {
          const groupKey = group.name ?? `__ungrouped_${groupIdx}`;
          const isCollapsed = group.name
            ? collapsedSteps.has(group.name)
            : false;

          return (
            <div key={groupKey}>
              {/* Step header */}
              {group.name && (
                <button
                  type="button"
                  onClick={() => toggleStep(group.name!)}
                  className="flex w-full items-center gap-1.5 border-b border-border/50 bg-card/60 px-3 py-1.5 text-left text-xs font-medium text-muted-foreground hover:bg-muted/60"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-3 w-3 shrink-0" />
                  ) : (
                    <ChevronDown className="h-3 w-3 shrink-0" />
                  )}
                  <span>{group.name}</span>
                  <span className="opacity-50">
                    {group.lineCount} line
                    {group.lineCount !== 1 ? "s" : ""}
                  </span>
                </button>
              )}

              {/* Lines */}
              {!isCollapsed &&
                group.lines.map((line) => {
                  const matches =
                    searchQuery &&
                    line.raw.toLowerCase().includes(searchLower);

                  // Hide non-matching lines when searching
                  if (searchQuery && !matches) return null;

                  return (
                    <div
                      key={line.lineNumber}
                      className={cn(
                        "flex hover:bg-muted/50",
                        matches && "bg-yellow-500/10",
                      )}
                    >
                      <span className="w-12 shrink-0 select-none pr-3 text-right tabular-nums text-muted-foreground/50">
                        {line.lineNumber}
                      </span>
                      <span
                        className="min-w-0 flex-1 whitespace-pre-wrap break-all text-foreground"
                        dangerouslySetInnerHTML={{ __html: line.html }}
                      />
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>

      {/* ANSI color CSS classes — theme-aware */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            /* Light mode ANSI colors */
            .log-viewer .ansi-black-fg { color: #3b3b3b; }
            .log-viewer .ansi-red-fg { color: #c33; }
            .log-viewer .ansi-green-fg { color: #168816; }
            .log-viewer .ansi-yellow-fg { color: #8a6d00; }
            .log-viewer .ansi-blue-fg { color: #2563eb; }
            .log-viewer .ansi-magenta-fg { color: #9333ea; }
            .log-viewer .ansi-cyan-fg { color: #0e7490; }
            .log-viewer .ansi-white-fg { color: #6b7280; }
            .log-viewer .ansi-bright-black-fg { color: #6b7280; }
            .log-viewer .ansi-bright-red-fg { color: #dc2626; }
            .log-viewer .ansi-bright-green-fg { color: #16a34a; }
            .log-viewer .ansi-bright-yellow-fg { color: #ca8a04; }
            .log-viewer .ansi-bright-blue-fg { color: #3b82f6; }
            .log-viewer .ansi-bright-magenta-fg { color: #a855f7; }
            .log-viewer .ansi-bright-cyan-fg { color: #06b6d4; }
            .log-viewer .ansi-bright-white-fg { color: #374151; }
            .log-viewer .ansi-black-bg { background-color: #f3f4f6; }
            .log-viewer .ansi-red-bg { background-color: #fecaca; }
            .log-viewer .ansi-green-bg { background-color: #bbf7d0; }
            .log-viewer .ansi-yellow-bg { background-color: #fef08a; }
            .log-viewer .ansi-blue-bg { background-color: #bfdbfe; }
            .log-viewer .ansi-magenta-bg { background-color: #e9d5ff; }
            .log-viewer .ansi-cyan-bg { background-color: #a5f3fc; }
            .log-viewer .ansi-white-bg { background-color: #e5e7eb; }

            /* Dark mode ANSI colors */
            .dark .log-viewer .ansi-black-fg { color: #545454; }
            .dark .log-viewer .ansi-red-fg { color: #ff5555; }
            .dark .log-viewer .ansi-green-fg { color: #50fa7b; }
            .dark .log-viewer .ansi-yellow-fg { color: #f1fa8c; }
            .dark .log-viewer .ansi-blue-fg { color: #6272a4; }
            .dark .log-viewer .ansi-magenta-fg { color: #ff79c6; }
            .dark .log-viewer .ansi-cyan-fg { color: #8be9fd; }
            .dark .log-viewer .ansi-white-fg { color: #f8f8f2; }
            .dark .log-viewer .ansi-bright-black-fg { color: #6272a4; }
            .dark .log-viewer .ansi-bright-red-fg { color: #ff6e6e; }
            .dark .log-viewer .ansi-bright-green-fg { color: #69ff94; }
            .dark .log-viewer .ansi-bright-yellow-fg { color: #ffffa5; }
            .dark .log-viewer .ansi-bright-blue-fg { color: #d6acff; }
            .dark .log-viewer .ansi-bright-magenta-fg { color: #ff92df; }
            .dark .log-viewer .ansi-bright-cyan-fg { color: #a4ffff; }
            .dark .log-viewer .ansi-bright-white-fg { color: #ffffff; }
            .dark .log-viewer .ansi-black-bg { background-color: #282a36; }
            .dark .log-viewer .ansi-red-bg { background-color: #ff5555; }
            .dark .log-viewer .ansi-green-bg { background-color: #50fa7b; }
            .dark .log-viewer .ansi-yellow-bg { background-color: #f1fa8c; }
            .dark .log-viewer .ansi-blue-bg { background-color: #6272a4; }
            .dark .log-viewer .ansi-magenta-bg { background-color: #ff79c6; }
            .dark .log-viewer .ansi-cyan-bg { background-color: #8be9fd; }
            .dark .log-viewer .ansi-white-bg { background-color: #f8f8f2; }

            /* Shared text decorations */
            .log-viewer .ansi-bold { font-weight: bold; }
            .log-viewer .ansi-dim { opacity: 0.7; }
            .log-viewer .ansi-italic { font-style: italic; }
            .log-viewer .ansi-underline { text-decoration: underline; }
            .log-viewer .ansi-strikethrough { text-decoration: line-through; }
          `,
        }}
      />
    </div>
  );
}
