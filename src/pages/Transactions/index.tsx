import React, { useEffect, useMemo, useState } from 'react';
import { ToggleButton } from 'react-native-paper';
import PageWrapper from '../PageWrapper';
import { TransactionInfoType } from '../../modals/TransactionInfo';
import { getTransactions } from '../../storage';
import { groupTransactionsBy } from '../../utils';
import Section from './Section';
import { MockButtons } from '../../mock';

const Transactions = () => {
  const [transactions, setTransactions] = useState<TransactionInfoType[]>([]);
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('week');
  useEffect(() => {
    let mounted = true;
    getTransactions().then(data => mounted && setTransactions(data));
    return () => {
      mounted = false;
    };
  });

  const transactionsBy = useMemo(
    () => groupTransactionsBy(transactions, groupBy),
    [groupBy, transactions],
  );

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
      {Object.entries(transactionsBy).map(([week, transactionsInWeek]) => (
        <Section
          key={week}
          title={week}
          transactions={transactionsInWeek}
          groupBy={groupBy}
        />
      ))}
    </PageWrapper>
  );
};

export default Transactions;
