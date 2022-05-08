import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { Layout } from '../../../styles';

type WidgetWrapperProps = {
  children: React.ReactNode;
} & ViewProps;

const WidgetWrapper = ({
  children,
  style,
  ...viewProps
}: WidgetWrapperProps) => {
  return (
    <View style={[styles.container, style]} {...viewProps}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...Layout.marginBottomSmall,
    ...Layout.allPadded,
    borderWidth: 1,
    borderColor: 'white',
  },
});

export default WidgetWrapper;
