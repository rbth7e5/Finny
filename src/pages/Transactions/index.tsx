import React, { useEffect, useState } from 'react';
import { Headline, List } from 'react-native-paper';
import PageWrapper from '../PageWrapper';
import { TransactionInfoType } from '../../modals/TransactionInfo';
import { getTransactions } from '../../storage';

const Transactions = () => {
  const [transactions, setTransactions] = useState<TransactionInfoType[]>([]);
  useEffect(() => {
    let mounted = true;
    getTransactions().then(data => mounted && setTransactions(data));
    return () => {
      mounted = false;
    };
  });
  return (
    <PageWrapper>
      <Headline>Transactions</Headline>
      {transactions.map(({ amount, category }, index) => (
        <List.Item
          key={`${index}${amount}${category}`}
          title={`$${amount}`}
          description={category}
        />
      ))}
    </PageWrapper>
  );
};

export default Transactions;
