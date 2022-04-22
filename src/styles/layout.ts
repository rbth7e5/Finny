import { ViewStyle } from 'react-native';

export const padded = {
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
