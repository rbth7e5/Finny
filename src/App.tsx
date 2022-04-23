import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import {
  Provider as PaperProvider,
  BottomNavigation,
  FAB,
} from 'react-native-paper';

import Transactions from './pages/Transactions';
import Overview from './pages/Overview';

import { DARK_THEME, LIGHT_THEME } from './theme';
import { Tab } from './enums';
import { Layout } from './styles';
import TransactionInfo, {
  TransactionInfoType,
  generateDefaultTransaction,
} from './modals/TransactionInfo';

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

  const [transactionInfo, setTransactionInfo] =
    useState<TransactionInfoType | null>(null);
  const addNewTransaction = useCallback(() => {
    setTransactionInfo(generateDefaultTransaction());
  }, []);

  return (
    <PaperProvider theme={isDarkMode ? DARK_THEME : LIGHT_THEME}>
      <BottomNavigation
        navigationState={{ index: tab, routes }}
        onIndexChange={setTab}
        renderScene={renderScene}
      />
      <FAB style={styles.fab} icon="plus" onPress={addNewTransaction} />
      <TransactionInfo
        transactionInfo={transactionInfo}
        setTransactionInfo={setTransactionInfo}
      />
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  fab: Layout.floating({ bottom: 64, right: 16 }),
});

export default App;
