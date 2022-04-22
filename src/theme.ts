import { DefaultTheme, DarkTheme } from 'react-native-paper';
import { Theme } from 'react-native-paper/lib/typescript/types';

export const DARK_THEME: Theme = {
  ...DarkTheme,
  roundness: 2,
  colors: {
    ...DarkTheme.colors,
    primary: '#004C4C',
    accent: '#607D8B',
  },
};

export const LIGHT_THEME: Theme = {
  ...DefaultTheme,
  roundness: 2,
  colors: {
    ...DefaultTheme.colors,
    primary: '#006666',
    accent: '#607D8B',
  },
};
