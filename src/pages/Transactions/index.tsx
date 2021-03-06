import React, { useState } from 'react';

import PageWrapper from '../PageWrapper';
import ActionBar from './ActionBar';
import NewTransactionFAB from './NewTransactionFAB';
import TransactionList from './TransactionList';

import useEntitiesFromStorage from '../../storage/useEntitiesFromStorage';

import { GroupBy } from './types';
import { readTransactions, TransactionInfoType } from '../../storage';

const Transactions = () => {
  const [transactions, setTransactions] =
    useEntitiesFromStorage<TransactionInfoType>(readTransactions);
  const [groupBy, setGroupBy] = useState<GroupBy>('day');

  return (
    <PageWrapper>
      <ActionBar
        transactions={transactions}
        groupBy={groupBy}
        onChangeGroupBy={(by: GroupBy) => setGroupBy(by)}
      />
      <TransactionList transactions={transactions} groupBy={groupBy} />
      <NewTransactionFAB setTransactions={setTransactions} />
    </PageWrapper>
  );
};

export default Transactions;
export * from './types';
export * from './utils';
