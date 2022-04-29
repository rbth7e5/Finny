import React, { useCallback, useMemo, useState } from 'react';
import { SectionList, StyleSheet } from 'react-native';
import { FAB, Text, useTheme } from 'react-native-paper';

import useTransactions from './useTransactions';
import PageWrapper from '../PageWrapper';
import Transaction from './Transaction';
import ActionBar from './ActionBar';

import { Layout } from '../../styles';
import { groupTransactionsBy } from './utils';
import TransactionInfo, {
  generateDefaultTransaction,
  TransactionInfoType,
} from '../../modals/TransactionInfo';
import { GroupBy } from './types';
import { Theme } from 'react-native-paper/lib/typescript/types';

const Transactions = () => {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [transactions, setTransactions] = useTransactions();
  const [groupBy, setGroupBy] = useState<GroupBy>('day');

  const [transactionInfo, setTransactionInfo] =
    useState<TransactionInfoType | null>(null);
  const addNewTransaction = useCallback(() => {
    setTransactionInfo(generateDefaultTransaction());
  }, []);

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
        setTransactions={setTransactions}
      />
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
      <FAB style={styles.fab} icon="plus" onPress={addNewTransaction} />
      <TransactionInfo
        transactionInfo={transactionInfo}
        setTransactionInfo={setTransactionInfo}
      />
    </PageWrapper>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    listContainer: {
      ...Layout.sidePadded,
    },
    sectionHeader: {
      backgroundColor: theme.colors.background,
      ...Layout.verticalPaddedSmall,
    },
    fab: {
      ...Layout.floating({ bottom: 112, right: 16 }),
      opacity: 0.8,
    },
  });

export default Transactions;
export * from './types';
