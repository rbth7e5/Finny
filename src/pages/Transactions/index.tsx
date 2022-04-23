import React, { useEffect, useState } from 'react';
import { List } from 'react-native-paper';
import PageWrapper from '../PageWrapper';
import { TransactionInfoType } from '../../modals/TransactionInfo';
import { getTransactions } from '../../storage';
import Transaction from './Transaction';

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
      {transactions.map(transactionInfo => (
        <Transaction
          key={transactionInfo.id}
          transactionInfo={transactionInfo}
        />
      ))}
    </PageWrapper>
  );
};

export default Transactions;
