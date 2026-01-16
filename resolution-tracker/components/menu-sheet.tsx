"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Target, LogOut, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type MenuSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MenuSheet({ open, onOpenChange }: MenuSheetProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Sign out error:", error.message);
      }
    } finally {
      onOpenChange(false);
      router.push("/auth/login");
    }
  };

  const handleNavClick = () => {
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[280px]">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription className="sr-only">
            Navigation menu
          </SheetDescription>
        </SheetHeader>
        <nav className="flex flex-col mt-4">
          <Link
            href="/chat"
            onClick={handleNavClick}
            className="flex items-center gap-3 h-12 px-3 rounded-xl hover:bg-accent transition-colors"
          >
            <MessageCircle className="h-5 w-5" />
            <span className="font-medium">Chat</span>
          </Link>
          <Link
            href="/goals"
            onClick={handleNavClick}
            className="flex items-center gap-3 h-12 px-3 rounded-xl hover:bg-accent transition-colors"
          >
            <Target className="h-5 w-5" />
            <span className="font-medium">Goals</span>
          </Link>
          <div className="my-2 border-t border-border" />
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 h-12 px-3 rounded-xl hover:bg-accent transition-colors text-left w-full"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
