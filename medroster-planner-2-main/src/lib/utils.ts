import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns a friendly first-name greeting fragment from a full name.
 * If the name starts with a title (a short word ending in "."), the title
 * is kept together with the actual first name, e.g.:
 *   "Sarah Jenkins" -> "Sarah"
 *   "Dr. Sarah Jenkins" -> "Dr. Sarah"
 *   "Mr. John Smith" -> "Mr. John"
 */
export function getGreetingName(fullName?: string | null): string {
  if (!fullName) return "there";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return "there";
  if (parts[0].endsWith(".") && parts.length > 1) {
    return `${parts[0]} ${parts[1]}`;
  }
  return parts[0];
}
