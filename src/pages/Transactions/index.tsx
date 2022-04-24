import React, { useEffect, useMemo, useState } from 'react';
import { SectionList } from 'react-native';
import { Title, ToggleButton } from 'react-native-paper';

import PageWrapper from '../PageWrapper';
import Transaction from './Transaction';
import { MockButtons } from '../../mock';

import { getTransactions } from '../../storage';
import { groupTransactionsBy } from './utils';

import { TransactionInfoType } from '../../modals/TransactionInfo';
import { GroupBy } from './types';

const Transactions = () => {
  const [transactions, setTransactions] = useState<TransactionInfoType[]>([]);
  const [groupBy, setGroupBy] = useState<GroupBy>('week');
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
      <MockButtons />
      <ToggleButton.Row
        onValueChange={value => setGroupBy(value as 'day' | 'week' | 'month')}
        value={groupBy}>
        <ToggleButton icon="calendar-today" value="day" />
        <ToggleButton icon="calendar-range" value="week" />
        <ToggleButton icon="calendar-month" value="month" />
      </ToggleButton.Row>
      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <Transaction transactionInfo={item} groupBy={groupBy} />
        )}
        renderSectionHeader={({ section: { title } }) => <Title>{title}</Title>}
      />
    </PageWrapper>
  );
};

export default Transactions;
export * from './types';
