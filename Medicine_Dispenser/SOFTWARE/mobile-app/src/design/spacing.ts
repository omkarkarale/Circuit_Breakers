export const spacing = {
  hairline: 1,
  xxs: 2,
  xs: 4,
  unit: 8,
  stackSm: 8,
  inlineMd: 12,
  stackMd: 16,
  stackLg: 24,
  gutter: 16,
  containerPadding: 24,
  cardPadding: 20,
  touchTargetMin: 48,
  iconButton: 40,
  iconTile: 48,
  compactIconTile: 40,
  inputHeight: 56,
  emptyIconTile: 64,
  diagnosticCardMinHeight: 140,
  bottomNavHeight: 64,
} as const;

export type AppSpacing = keyof typeof spacing;
