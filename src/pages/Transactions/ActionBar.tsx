import React, { useCallback, useState } from 'react';
import {
  IconButton,
  Searchbar,
  ToggleButton,
  useTheme,
} from 'react-native-paper';
import { StyleSheet, View } from 'react-native';
import { Layout } from '../../styles';
import { GroupBy } from './types';
import { searchTransactions } from './utils';
import { TransactionInfoType } from '../../storage';
import TransactionList from './TransactionList';
import { Theme } from 'react-native-paper/lib/typescript/types';

export type ActionBarProps = {
  transactions: TransactionInfoType[];
  groupBy: GroupBy;
  onChangeGroupBy: (by: GroupBy) => void;
};

const ActionBar = ({
  transactions,
  groupBy,
  onChangeGroupBy,
}: ActionBarProps) => {
  const styles = makeStyles(useTheme());
  const [filteredTransactions, setFilteredTransactions] = useState<
    TransactionInfoType[]
  >([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const onChangeSearch = useCallback(
    (query: string) => {
      const newFilteredTransactions = searchTransactions(transactions, query);
      setFilteredTransactions(newFilteredTransactions);
      setSearchQuery(query);
    },
    [transactions],
  );
  const onHideSearch = useCallback(() => setShowSearch(false), []);
  const onShowSearch = useCallback(() => setShowSearch(true), []);

  return (
    <>
      <View style={styles.floatingActions}>
        {showSearch && (
          <Searchbar
            autoFocus
            icon="chevron-left"
            placeholder="Search category, description..."
            value={searchQuery}
            onChangeText={onChangeSearch}
            onIconPress={onHideSearch}
          />
        )}
        <IconButton onPress={onShowSearch} icon="magnify" />
        <ToggleButton.Row
          onValueChange={value =>
            onChangeGroupBy(value as 'day' | 'week' | 'month')
          }
          value={groupBy}>
          <ToggleButton icon="calendar-today" value="day" />
          <ToggleButton icon="calendar-range" value="week" />
          <ToggleButton icon="calendar-month" value="month" />
        </ToggleButton.Row>
      </View>
      {showSearch && (
        <View style={styles.filteredList}>
          <TransactionList
            transactions={filteredTransactions}
            groupBy={groupBy}
          />
        </View>
      )}
    </>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    floatingActions: {
      ...Layout.flexRow({
        justifyContent: 'space-between',
        alignItems: 'center',
      }),
      ...Layout.sidePadded,
    },
    filteredList: {
      ...Layout.floating({
        top: 48,
        left: 0,
        right: 0,
        bottom: 0,
      }),
      backgroundColor: theme.colors.background,
      zIndex: 1,
    },
  });

export default ActionBar;
