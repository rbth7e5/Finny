import React, { useMemo } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import Transaction from './Transaction';
import { Caption, Text, useTheme } from 'react-native-paper';
import { Theme } from 'react-native-paper/lib/typescript/types';
import { Layout } from '../../styles';
import { groupTransactionsBy } from './utils';
import { TransactionInfoType } from '../../storage';
import { GroupBy } from './types';

export type TransactionListProps = {
  transactions: TransactionInfoType[];
  groupBy: GroupBy;
};

const TransactionList = ({ transactions, groupBy }: TransactionListProps) => {
  const styles = makeStyles(useTheme());

  const sections = useMemo(() => {
    const transactionsBy = groupTransactionsBy(transactions, groupBy);
    return Object.entries(transactionsBy).map(([week, transactionsInWeek]) => ({
      title: week,
      data: transactionsInWeek,
    }));
  }, [groupBy, transactions]);

  return transactions.length > 0 ? (
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

export default TransactionList;
