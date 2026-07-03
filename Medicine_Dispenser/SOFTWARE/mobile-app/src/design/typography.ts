import type { TextStyle } from 'react-native';

export const fontFamily = {
  inter: 'Inter',
} as const;

export const typography = {
  headlineLg: {
    fontFamily: fontFamily.inter,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.64,
  },
  headlineLgMobile: {
    fontFamily: fontFamily.inter,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.28,
  },
  headlineMd: {
    fontFamily: fontFamily.inter,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600',
  },
  headlineSm: {
    fontFamily: fontFamily.inter,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
  },
  bodyLg: {
    fontFamily: fontFamily.inter,
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '400',
  },
  bodyMd: {
    fontFamily: fontFamily.inter,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  labelLg: {
    fontFamily: fontFamily.inter,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  labelSm: {
    fontFamily: fontFamily.inter,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  diagnosticBadge: {
    fontFamily: fontFamily.inter,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '500',
    letterSpacing: 0.8,
  },
} satisfies Record<string, TextStyle>;

export type TypographyToken = keyof typeof typography;
