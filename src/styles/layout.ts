import { ViewStyle } from 'react-native';

export const padded: ViewStyle = {
  paddingHorizontal: 16,
};

export const floating = (positioning: {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}): ViewStyle => ({
  position: 'absolute',
  ...positioning,
});

export const flushRight: ViewStyle = {
  marginLeft: 'auto',
};
