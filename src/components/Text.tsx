import React from 'react';
import { Text as NativeText, TextProps } from 'react-native';
import { useTheme } from 'react-native-paper';

const Text = (props: TextProps) => {
  const { colors } = useTheme();
  return <NativeText style={{ color: colors.text }} {...props} />;
};

export default Text;
