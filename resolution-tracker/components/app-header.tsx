"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

type AppHeaderProps = {
  title?: string;
  onMenuClick: () => void;
};

export function AppHeader({ title = "Resolution Tracker", onMenuClick }: AppHeaderProps) {
  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-border bg-background">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
    </header>
  );
}
