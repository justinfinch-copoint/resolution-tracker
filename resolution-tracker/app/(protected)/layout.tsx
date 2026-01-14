"use client";

import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import { MenuSheet } from "@/components/menu-sheet";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader onMenuClick={() => setMenuOpen(true)} />
      <MenuSheet open={menuOpen} onOpenChange={setMenuOpen} />
      <main className="flex-1 w-full max-w-[600px] mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
