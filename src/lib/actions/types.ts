export type ActionState =
  | { error?: string; fieldErrors?: Record<string, string>; success?: string }
  | null;

export function safeInternalPath(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  // Reject protocol-relative ("//host") and backslash ("/\\host") forms that browsers treat as external.
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
