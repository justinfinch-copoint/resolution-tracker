import { createClient } from "@/lib/supabase/client";

export const VALID_COMMANDS = ["/goals", "/help", "/settings", "/signout"] as const;
export type Command = (typeof VALID_COMMANDS)[number];

export function isValidCommand(input: string): input is Command {
  return VALID_COMMANDS.includes(input.toLowerCase() as Command);
}

export function parseCommand(input: string): Command | null {
  const trimmed = input.trim().toLowerCase();
  if (trimmed.startsWith("/") && isValidCommand(trimmed)) {
    return trimmed as Command;
  }
  return null;
}

export type CommandHandler = {
  navigateTo: (path: string) => void;
  showHelp: () => void;
};

export async function executeCommand(
  command: Command,
  handlers: CommandHandler
): Promise<void> {
  switch (command) {
    case "/goals":
      handlers.navigateTo("/goals");
      break;
    case "/help":
      handlers.showHelp();
      break;
    case "/settings":
      handlers.navigateTo("/settings");
      break;
    case "/signout":
      const supabase = createClient();
      await supabase.auth.signOut();
      handlers.navigateTo("/auth/login");
      break;
  }
}
