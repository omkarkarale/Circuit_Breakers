import { MD3LightTheme, configureFonts } from 'react-native-paper';

export const appTheme = {
  ...MD3LightTheme,
  roundness: 16,
  fonts: configureFonts({ config: MD3LightTheme.fonts }),
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1565C0',
    onPrimary: '#FFFFFF',
    primaryContainer: '#D8E8FF',
    onPrimaryContainer: '#00315F',
    secondary: '#2E7D6B',
    background: '#FFFFFF',
    onBackground: '#102033',
    surface: '#FFFFFF',
    surfaceVariant: '#F1F6FB',
    onSurface: '#102033',
    onSurfaceVariant: '#5D6B7A',
    outline: '#C8D3DF',
    outlineVariant: '#E1EAF2',
  },
};

export type AppTheme = typeof appTheme;
