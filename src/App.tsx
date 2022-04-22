import React, { useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import {
  Provider as PaperProvider,
  BottomNavigation,
} from 'react-native-paper';

import { DARK_THEME, LIGHT_THEME } from './theme';
import Transactions from './pages/Transactions';
import Overview from './pages/Overview';

import { Tab } from './enums';

const App = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const [tab, setTab] = useState<Tab>(Tab.Transactions);
  const routes = useMemo(
    () => [
      { key: 'transactions', title: 'Transactions', icon: 'history' },
      { key: 'overview', title: 'Overview', icon: 'album' },
    ],
    [],
  );
  const renderScene = BottomNavigation.SceneMap({
    transactions: Transactions,
    overview: Overview,
  });

  return (
    <PaperProvider theme={isDarkMode ? DARK_THEME : LIGHT_THEME}>
      <BottomNavigation
        navigationState={{ index: tab, routes }}
        onIndexChange={setTab}
        renderScene={renderScene}
      />
    </PaperProvider>
  );
};

export default App;
