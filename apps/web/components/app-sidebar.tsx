"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  PanelRight,
  Home,
  Users,
  ChevronRight,
  ChevronLeft,
  Settings,
  LogOut,
  ChevronsUpDown,
  User,
  ShieldCheck,
  BookOpen,
  ClipboardList,
  Bug,
  Server,
  ListChecks,
  Key,
  Calendar,
  MoreHorizontal,
  Link2,
  Archive,
  UserMinus,
  Plus,
  GripVertical,
  Workflow,
} from "lucide-react";
import { useDrag, useDrop, type ConnectDragSource } from "react-dnd";
import { authClient } from "@/lib/auth-client";
import { useWorkspace, type Team } from "@/lib/workspace-context";
import { useSidebarStore, useSidebarReady } from "@/lib/stores/sidebar-store";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CreateTeamDialog } from "@/components/create-team-dialog";

interface AppSidebarProps {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
}

const TEAM_DND_TYPE = "SIDEBAR_TEAM";

const teamSubItems = [
  { segment: "test-repo", label: "Test Repo", icon: BookOpen },
  { segment: "test-runs", label: "Test Runs", icon: ClipboardList },
  { segment: "defects", label: "Defects", icon: Bug },
];

const settingsNavItems = [
  { segment: "settings", label: "Profile", icon: User, exact: true },
  {
    segment: "settings/security",
    label: "Security",
    icon: ShieldCheck,
    exact: false,
  },
  {
    segment: "settings/tokens",
    label: "API Tokens",
    icon: Key,
    exact: false,
  },
  {
    segment: "settings/cycles",
    label: "Workspace Cycles",
    icon: Calendar,
    exact: false,
  },
];

const teamSettingsNavItems = [
  { segment: "settings", label: "Overview", icon: Settings, exact: true },
  {
    segment: "settings/members",
    label: "Members",
    icon: Users,
    exact: false,
  },
  {
    segment: "settings/environments",
    label: "Environments",
    icon: Server,
    exact: false,
  },
  {
    segment: "settings/test-plans",
    label: "Test Plans",
    icon: ListChecks,
    exact: false,
  },
  {
    segment: "settings/shared-steps",
    label: "Shared Steps",
    icon: Workflow,
    exact: false,
  },
  {
    segment: "settings/tokens",
    label: "API Tokens",
    icon: Key,
    exact: false,
  },
  {
    segment: "settings/cycles",
    label: "Cycles",
    icon: Archive,
    exact: false,
  },
];

export function AppSidebar({ user }: AppSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { workspace, teams, isAdmin } = useWorkspace();
  const { expanded, toggle, expandedTeams, toggleTeam } = useSidebarStore();
  const ready = useSidebarReady();
  const [enableTransition, setEnableTransition] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Local team order for optimistic DnD updates
  const [localTeams, setLocalTeams] = useState<Team[]>(teams);
  useEffect(() => {
    setLocalTeams(teams);
  }, [teams]);

  const segments = pathname.split("/").filter(Boolean);
  const isSettings = segments.length >= 2 && segments[1] === "settings";
  const isTeamSettings = segments.length >= 3 && segments[2] === "settings" && !isSettings;
  const teamSlug = isTeamSettings ? segments[1] : null;

  useEffect(() => {
    if (ready) {
      requestAnimationFrame(() => setEnableTransition(true));
    }
  }, [ready]);

  async function handleSignOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login");
        },
      },
    });
  }

  const moveTeam = useCallback(
    (dragIndex: number, hoverIndex: number) => {
      setLocalTeams((prev) => {
        const updated = [...prev];
        const [moved] = updated.splice(dragIndex, 1);
        updated.splice(hoverIndex, 0, moved);
        return updated;
      });
    },
    [],
  );

  const persistOrder = useCallback(async () => {
    try {
      await fetch("/api/teams/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: workspace.id,
          teamIds: localTeams.map((t) => t.id),
        }),
      });
    } catch {
      // Revert on failure
      setLocalTeams(teams);
    }
  }, [localTeams, workspace.id, teams]);

  const isExpanded = isSettings || isTeamSettings ? true : expanded;
  const basePath = `/${workspace.slug}`;

  return (
    <>
      <aside
        className={cn(
          "fixed bottom-0 left-0 z-40 flex flex-col border-r bg-card",
          !ready && "invisible",
          enableTransition && "transition-[width] duration-200",
          isExpanded ? "w-64" : "w-16",
        )}
        style={{ top: "var(--demo-banner-h, 0px)" }}
      >
        {isSettings ? (
          <SettingsHeader basePath={basePath} backLabel="Back to app" />
        ) : isTeamSettings ? (
          <SettingsHeader basePath={`${basePath}/${teamSlug}`} backLabel="Back to team" />
        ) : (
          <WorkspaceHeader
            workspace={workspace}
            user={user}
            expanded={isExpanded}
            ready={ready}
            toggle={toggle}
            handleSignOut={handleSignOut}
            basePath={basePath}
          />
        )}

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-2">
          {isSettings ? (
            <>
              {[
                ...settingsNavItems,
                ...(isAdmin
                  ? [
                      {
                        segment: "settings/members",
                        label: "Members",
                        icon: Users,
                        exact: false,
                      },
                    ]
                  : []),
              ].map((item) => {
                const href = `${basePath}/${item.segment}`;
                const active = item.exact
                  ? pathname === href
                  : pathname === href || pathname.startsWith(href + "/");
                return (
                  <NavItem
                    key={href}
                    href={href}
                    label={item.label}
                    icon={item.icon}
                    active={active}
                    expanded
                  />
                );
              })}
            </>
          ) : isTeamSettings ? (
            <>
              {teamSettingsNavItems.map((item) => {
                const href = `${basePath}/${teamSlug}/${item.segment}`;
                const active = item.exact
                  ? pathname === href
                  : pathname === href || pathname.startsWith(href + "/");
                return (
                  <NavItem
                    key={href}
                    href={href}
                    label={item.label}
                    icon={item.icon}
                    active={active}
                    expanded
                  />
                );
              })}
            </>
          ) : (
            <>
              <NavItem
                href={`${basePath}/dashboard`}
                label="Home"
                icon={Home}
                active={pathname === `${basePath}/dashboard`}
                expanded={isExpanded}
              />

              {/* Your teams section */}
              {isExpanded && (
                <div className="pt-4">
                  <div className="mb-1 flex items-center justify-between px-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Your teams
                    </p>
                    {isAdmin && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => setCreateDialogOpen(true)}
                            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right">Add team</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  {localTeams.map((team, index) => (
                    <DraggableTeamItem
                      key={team.id}
                      team={team}
                      index={index}
                      basePath={basePath}
                      pathname={pathname}
                      isOpen={expandedTeams[team.id] ?? false}
                      onToggle={() => toggleTeam(team.id)}
                      moveTeam={moveTeam}
                      onDrop={persistOrder}
                      canDrag={isAdmin}
                    />
                  ))}
                </div>
              )}

              {/* Collapsed: show team icons */}
              {!isExpanded && localTeams.length > 0 && (
                <div className="pt-4">
                  {localTeams.map((team) => {
                    const teamPath = `${basePath}/${team.key}`;
                    const active = pathname.startsWith(teamPath);
                    return (
                      <Tooltip key={team.id}>
                        <TooltipTrigger asChild>
                          <Link
                            href={`${teamPath}/test-repo`}
                            className={cn(
                              "flex h-9 items-center justify-center rounded-lg text-sm transition-colors",
                              active
                                ? "bg-foreground text-background"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            )}
                          >
                            <span className="text-xs font-medium">
                              {team.name.slice(0, 2).toUpperCase()}
                            </span>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          {team.name}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </nav>

        <CreateTeamDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          organizationId={workspace.id}
          onCreated={() => {
            setCreateDialogOpen(false);
            router.refresh();
          }}
        />
      </aside>
    </>
  );
}

function DraggableTeamItem({
  team,
  index,
  basePath,
  pathname,
  isOpen,
  onToggle,
  moveTeam,
  onDrop,
  canDrag,
}: {
  team: Team;
  index: number;
  basePath: string;
  pathname: string;
  isOpen: boolean;
  onToggle: () => void;
  moveTeam: (dragIndex: number, hoverIndex: number) => void;
  onDrop: () => void;
  canDrag: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag, preview] = useDrag({
    type: TEAM_DND_TYPE,
    item: () => ({ id: team.id, index }),
    canDrag,
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
    accept: TEAM_DND_TYPE,
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

      // Only move when cursor crosses the midpoint
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

      moveTeam(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  preview(drop(ref));

  return (
    <div
      ref={ref}
      className={cn(isDragging && "opacity-40")}
    >
      <TeamItem
        team={team}
        basePath={basePath}
        pathname={pathname}
        isOpen={isDragging ? false : isOpen}
        onToggle={onToggle}
        dragRef={drag}
        canDrag={canDrag}
      />
    </div>
  );
}

function SettingsHeader({
  basePath,
  backLabel = "Back to app",
}: {
  basePath: string;
  backLabel?: string;
}) {
  // Determine the back link based on the basePath
  let backLink: string;
  if (basePath.includes("/settings")) {
    backLink = basePath.replace("/settings", "");
  } else if (backLabel === "Back to team") {
    // Team settings: back to test-repo
    backLink = `${basePath}/test-repo`;
  } else {
    // Workspace settings: back to dashboard
    backLink = `${basePath}/dashboard`;
  }

  return (
    <div className="px-3 py-3">
      <Link
        href={backLink}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        <span>{backLabel}</span>
      </Link>
    </div>
  );
}

function WorkspaceHeader({
  workspace,
  user,
  expanded,
  ready,
  toggle,
  handleSignOut,
  basePath,
}: {
  workspace: { name: string; slug: string; logo: string | null };
  user: AppSidebarProps["user"];
  expanded: boolean;
  ready: boolean;
  toggle: () => void;
  handleSignOut: () => void;
  basePath: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center",
        expanded ? "px-3 py-3" : "flex-col gap-2 px-0 py-3",
      )}
    >
      <div className="min-w-0 flex-1">
        {ready ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg text-left transition-colors hover:bg-muted",
                  expanded ? "px-2 py-1.5" : "justify-center p-1.5",
                )}
              >
                <Avatar className="h-9 w-9 shrink-0 rounded-full">
                  <AvatarImage
                    src={user.image ?? undefined}
                    alt={user.name}
                  />
                  <AvatarFallback className="rounded-full text-xs">
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                {expanded && (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {workspace.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side={expanded ? "bottom" : "right"}
              align="start"
              className="w-56"
            >
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user.name}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`${basePath}/settings`}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div
            className={cn(
              "flex w-full items-center gap-3",
              expanded ? "px-2 py-1.5" : "justify-center p-1.5",
            )}
          >
            <Avatar className="h-9 w-9 shrink-0 rounded-full">
              <AvatarImage
                src={user.image ?? undefined}
                alt={user.name}
              />
              <AvatarFallback className="rounded-full text-xs">
                {user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            {expanded && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {workspace.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <button
        onClick={toggle}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <PanelRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function TeamItem({
  team,
  basePath,
  pathname,
  isOpen,
  onToggle,
  dragRef,
  canDrag,
}: {
  team: Team;
  basePath: string;
  pathname: string;
  isOpen: boolean;
  onToggle: () => void;
  dragRef: ConnectDragSource;
  canDrag: boolean;
}) {
  const teamPath = `${basePath}/${team.key}`;
  const isActive = pathname.startsWith(teamPath);

  function handleCopyLink() {
    navigator.clipboard.writeText(
      `${window.location.origin}${teamPath}/test-repo`,
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div className="group flex items-center pr-3">
        {/* Drag handle */}
        {canDrag ? (
          <div
            ref={(node) => { dragRef(node); }}
            className="flex h-8 w-5 shrink-0 cursor-grab items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
          >
            <GripVertical className="h-3 w-3 text-muted-foreground" />
          </div>
        ) : (
          <div className="w-1 shrink-0" />
        )}

        <CollapsibleTrigger asChild>
          <button
            className={cn(
              "flex h-8 flex-1 items-center gap-2 rounded-lg px-1 text-sm transition-colors",
              isActive
                ? "font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 shrink-0 transition-transform",
                isOpen && "rotate-90",
              )}
            />
            <span className="truncate">{team.name}</span>
          </button>
        </CollapsibleTrigger>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="w-48">
            <DropdownMenuItem asChild>
              <Link href={`${teamPath}/settings`}>
                <Settings className="mr-2 h-4 w-4" />
                Team settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCopyLink}>
              <Link2 className="mr-2 h-4 w-4" />
              Copy link
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <Archive className="mr-2 h-4 w-4" />
              Open archive
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <UserMinus className="mr-2 h-4 w-4" />
              Leave team
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CollapsibleContent>
        <div className="ml-8 space-y-0.5 pl-4">
          {teamSubItems.map((item) => {
            const href = `${teamPath}/${item.segment}`;
            const active =
              pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={item.segment}
                href={href}
                className={cn(
                  "flex h-7 items-center gap-2 rounded-md px-2 text-sm transition-colors",
                  active
                    ? "bg-muted/50 text-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className="h-3.5 w-3.5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  expanded,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  expanded: boolean;
}) {
  const link = (
    <Link
      href={href}
      className={cn(
        "flex h-9 items-center rounded-lg text-sm transition-colors",
        expanded ? "gap-3 px-3" : "justify-center",
        active
          ? "bg-muted/50 text-foreground font-medium"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {expanded && <span>{label}</span>}
    </Link>
  );

  if (!expanded) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return link;
}
