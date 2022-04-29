import React, { Dispatch, SetStateAction, useState } from 'react';
import { MockButtons } from '../../mock';
import { IconButton, Searchbar, ToggleButton } from 'react-native-paper';
import { StyleSheet, View } from 'react-native';
import { Layout } from '../../styles';
import { GroupBy } from './types';

export type ActionBarProps = {
  groupBy: GroupBy;
  setGroupBy: Dispatch<SetStateAction<GroupBy>>;
};

const ActionBar = ({ groupBy, setGroupBy }: ActionBarProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const onChangeSearch = (query: string) => setSearchQuery(query);
  const onHideSearch = () => setShowSearch(false);
  const onShowSearch = () => setShowSearch(true);

  return (
    <View style={styles.floatingActions}>
      {showSearch && (
        <Searchbar
          icon="chevron-left"
          placeholder="Search Transactions"
          value={searchQuery}
          onChangeText={onChangeSearch}
          onIconPress={onHideSearch}
        />
      )}
      <IconButton onPress={onShowSearch} icon="magnify" />
      <MockButtons />
      <ToggleButton.Row
        onValueChange={value => setGroupBy(value as 'day' | 'week' | 'month')}
        value={groupBy}>
        <ToggleButton icon="calendar-today" value="day" />
        <ToggleButton icon="calendar-range" value="week" />
        <ToggleButton icon="calendar-month" value="month" />
      </ToggleButton.Row>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingActions: {
    ...Layout.flexRow({
      justifyContent: 'space-between',
      alignItems: 'center',
    }),
    ...Layout.sidePadded,
  },
});

export default ActionBar;
