import React from 'react';
import {
  SafeAreaView,
  StatusBar,
  View,
  ViewProps,
  useColorScheme,
} from 'react-native';

type PageWrapperProps = {
  children: React.ReactNode;
} & ViewProps;

const PageWrapper = ({ children, ...viewProps }: PageWrapperProps) => {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <SafeAreaView>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View {...viewProps}>{children}</View>
    </SafeAreaView>
  );
};

export default PageWrapper;
