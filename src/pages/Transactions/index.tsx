import React, { useMemo, useState } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { Caption, Text, useTheme } from 'react-native-paper';

import useTransactions from './useTransactions';
import PageWrapper from '../PageWrapper';
import Transaction from './Transaction';
import ActionBar from './ActionBar';
import NewTransactionFAB from './NewTransactionFAB';

import { Layout } from '../../styles';
import { groupTransactionsBy } from './utils';
import { GroupBy } from './types';
import { Theme } from 'react-native-paper/lib/typescript/types';

const Transactions = () => {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [transactions, setTransactions] = useTransactions();
  const [groupBy, setGroupBy] = useState<GroupBy>('day');

  const sections = useMemo(() => {
    const transactionsBy = groupTransactionsBy(transactions, groupBy);
    return Object.entries(transactionsBy).map(([week, transactionsInWeek]) => ({
      title: week,
      data: transactionsInWeek,
    }));
  }, [groupBy, transactions]);

  return (
    <PageWrapper>
      <ActionBar
        groupBy={groupBy}
        setGroupBy={setGroupBy}
        transactions={transactions}
        setTransactions={setTransactions}
      />
      {transactions.length > 0 ? (
        <SectionList
          style={styles.listContainer}
          sections={sections}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <Transaction transactionInfo={item} groupBy={groupBy} />
          )}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionHeader}>{title}</Text>
          )}
        />
      ) : (
        <View style={styles.emptyView}>
          <Caption>No Transactions</Caption>
        </View>
      )}
      <NewTransactionFAB setTransactions={setTransactions} />
    </PageWrapper>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    listContainer: {
      ...Layout.sidePadded,
    },
    emptyView: {
      height: '100%',
      ...Layout.flexColumn({ justifyContent: 'center', alignItems: 'center' }),
    },
    sectionHeader: {
      backgroundColor: theme.colors.background,
      ...Layout.verticalPaddedSmall,
    },
  });

export default Transactions;
export * from './types';
export { generateDefaultTransaction } from './utils';
