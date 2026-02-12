"use client";

import { type ReactNode } from "react";
import dynamic from "next/dynamic";
import data from "@emoji-mart/data";
import { useTheme } from "next-themes";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Dynamic import to avoid SSR issues with emoji-mart
const Picker = dynamic(() => import("@emoji-mart/react").then((m) => m.default), {
  ssr: false,
  loading: () => (
    <div className="flex h-[350px] w-[352px] items-center justify-center text-sm text-muted-foreground">
      Loading...
    </div>
  ),
});

interface EmojiPickerPopoverProps {
  children: ReactNode;
  onEmojiSelect: (emoji: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

export function EmojiPickerPopover({
  children,
  onEmojiSelect,
  open,
  onOpenChange,
  side = "bottom",
  align = "end",
}: EmojiPickerPopoverProps) {
  const { resolvedTheme } = useTheme();

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        className="w-auto border-none p-0 shadow-lg"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <Picker
          data={data}
          onEmojiSelect={(emoji: { native: string }) => {
            onEmojiSelect(emoji.native);
            onOpenChange(false);
          }}
          theme={resolvedTheme === "dark" ? "dark" : "light"}
          set="native"
          previewPosition="none"
          skinTonePosition="search"
          maxFrequentRows={2}
        />
      </PopoverContent>
    </Popover>
  );
}
