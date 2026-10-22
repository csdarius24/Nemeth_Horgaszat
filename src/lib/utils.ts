import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind osztálynevek összefűzése, ütközések feloldásával (shadcn konvenció). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
