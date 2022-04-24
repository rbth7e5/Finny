import { FlexAlignType, ViewStyle } from 'react-native';

export const sidePadded: ViewStyle = {
  paddingHorizontal: 16,
};

export const allPadded: ViewStyle = {
  ...sidePadded,
  paddingVertical: 8,
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

export const marginBottomSmall: ViewStyle = {
  marginBottom: 8,
};

export const flexRow = (positioning: {
  justifyContent:
    | 'flex-start'
    | 'flex-end'
    | 'center'
    | 'space-between'
    | 'space-around'
    | 'space-evenly'
    | undefined;
  alignItems: FlexAlignType;
}): ViewStyle => ({
  display: 'flex',
  flexDirection: 'row',
  ...positioning,
});

export const flexColumn = (positioning: {
  justifyContent:
    | 'flex-start'
    | 'flex-end'
    | 'center'
    | 'space-between'
    | 'space-around'
    | 'space-evenly'
    | undefined;
  alignItems: FlexAlignType;
}): ViewStyle => ({
  display: 'flex',
  flexDirection: 'column',
  ...positioning,
});
