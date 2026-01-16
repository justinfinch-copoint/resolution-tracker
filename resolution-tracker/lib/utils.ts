import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// This check can be removed, it is just for tutorial purposes
export const hasEnvVars =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Default redirect for authenticated users (shared constant to avoid DRY violation)
export const DEFAULT_PROTECTED_PAGE_FALLBACK = "/chat";

// Validate redirect path to prevent open redirect attacks
export function isValidRedirectPath(path: string): boolean {
  // Must start with / and not contain :// (prevents //evil.com and https://evil.com)
  return path.startsWith("/") && !path.includes("://");
}
