export const radius = {
  default: 4,
  lg: 8,
  xl: 12,
  full: 9999,
} as const;

export type AppRadius = keyof typeof radius;
