import React, { useEffect, useMemo, useState } from 'react';
import PageWrapper from '../PageWrapper';
import { TransactionInfoType } from '../../modals/TransactionInfo';
import { getTransactions } from '../../storage';
import { groupTransactionsByWeek } from '../../utils';
import Section from './Section';
import { MockButtons } from '../../mock';

const Transactions = () => {
  const [transactions, setTransactions] = useState<TransactionInfoType[]>([]);
  useEffect(() => {
    let mounted = true;
    getTransactions().then(data => mounted && setTransactions(data));
    return () => {
      mounted = false;
    };
  });

  const transactionsByWeek = useMemo(
    () => groupTransactionsByWeek(transactions),
    [transactions],
  );

  return (
    <PageWrapper>
      <MockButtons />
      {Object.entries(transactionsByWeek).map(([week, transactionsInWeek]) => (
        <Section key={week} title={week} transactions={transactionsInWeek} />
      ))}
    </PageWrapper>
  );
};

export default Transactions;
