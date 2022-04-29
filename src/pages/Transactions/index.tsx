import React, { useEffect, useMemo, useState } from 'react';
import { SectionList, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import PageWrapper from '../PageWrapper';
import Transaction from './Transaction';

import { getTransactions } from '../../storage';
import { groupTransactionsBy } from './utils';
import { Layout } from '../../styles';

import { TransactionInfoType } from '../../modals/TransactionInfo';
import { GroupBy } from './types';
import { Theme } from 'react-native-paper/lib/typescript/types';
import ActionBar from './ActionBar';

const Transactions = () => {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [transactions, setTransactions] = useState<TransactionInfoType[]>([]);
  const [groupBy, setGroupBy] = useState<GroupBy>('day');
  useEffect(() => {
    let mounted = true;
    getTransactions().then(data => mounted && setTransactions(data));
    return () => {
      mounted = false;
    };
  });

  const sections = useMemo(() => {
    const transactionsBy = groupTransactionsBy(transactions, groupBy);
    return Object.entries(transactionsBy).map(([week, transactionsInWeek]) => ({
      title: week,
      data: transactionsInWeek,
    }));
  }, [groupBy, transactions]);

  return (
    <PageWrapper>
      <ActionBar groupBy={groupBy} setGroupBy={setGroupBy} />
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
  });

export default Transactions;
export * from './types';
