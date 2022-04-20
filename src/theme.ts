import { DefaultTheme } from 'react-native-paper';

export const DARK_THEME = {
  ...DefaultTheme,
  roundness: 2,
  colors: {
    ...DefaultTheme.colors,
    primary: '#1A1A1A',
    accent: '#FAFAFA',
    text: '#FAFAFA',
  },
};

export const LIGHT_THEME = {
  ...DefaultTheme,
  roundness: 2,
  colors: {
    ...DefaultTheme.colors,
    primary: '#FAFAFA',
    accent: '#1A1A1A',
    text: '#1A1A1A',
  },
};
