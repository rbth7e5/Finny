import React from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  ViewProps,
  useColorScheme,
} from 'react-native';

type PageWrapperProps = {
  children: React.ReactNode;
} & ViewProps;

const PageWrapper = ({ children, style, ...viewProps }: PageWrapperProps) => {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <SafeAreaView>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={[styles.container, style]} {...viewProps}>
        {children}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 96,
  },
});

export default PageWrapper;
