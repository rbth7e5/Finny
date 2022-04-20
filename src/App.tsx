import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  useColorScheme,
  View,
} from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';

import Text from './components/Text';
import { DARK_THEME, LIGHT_THEME } from './theme';

const App = () => {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <PaperProvider theme={isDarkMode ? DARK_THEME : LIGHT_THEME}>
      <SafeAreaView>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <ScrollView contentInsetAdjustmentBehavior="automatic">
          <View>
            <Text>Hello, Welcome to Finny!</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </PaperProvider>
  );
};

export default App;
