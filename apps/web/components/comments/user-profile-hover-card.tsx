"use client";

import { type ReactNode } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import type { UserData } from "./types";

interface UserProfileHoverCardProps {
  user: UserData | undefined;
  children: ReactNode;
}

export function UserProfileHoverCard({
  user,
  children,
}: UserProfileHoverCardProps) {
  if (!user) {
    return <>{children}</>;
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent side="top" align="start" className="w-auto min-w-48">
        <div className="flex items-center gap-3">
          <Avatar className="shrink-0">
            {user.image && <AvatarImage src={user.image} alt={user.name} />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
