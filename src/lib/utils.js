import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Combine class names (used by shadcn/ui components)
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Clean, deduplicate, and validate mobile numbers
export function processMobileNumbers(rawInput) {
  // Split by commas, newlines, spaces, or semicolons
  const numbers = rawInput
    .split(/[,\n;\s]+/)
    .map((num) => num.trim())
    .filter((num) => num.length > 0);

  // Remove all non-digit characters (except leading +)
  const cleaned = numbers.map((num) => {
    if (num.startsWith("+")) {
      return "+" + num.slice(1).replace(/\D/g, "");
    }
    return num.replace(/\D/g, "");
  });

  // Deduplicate
  const unique = [...new Set(cleaned)];

  // Validate: must be 10-15 digits (with or without country code)
  const valid = [];
  const invalid = [];

  unique.forEach((num) => {
    const digitsOnly = num.replace(/\+/, "");
    if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
      valid.push(num);
    } else {
      invalid.push(num);
    }
  });

  return { valid, invalid, totalInput: numbers.length, duplicatesRemoved: numbers.length - unique.length };
}
