import React, { useEffect, useState } from 'react';
import { List } from 'react-native-paper';
import PageWrapper from '../PageWrapper';
import { View } from 'react-native';
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
      <View>
        <List.Subheader>Hello, Welcome to your transactions!</List.Subheader>
        {transactions.map(({ amount, category }, index) => (
          <List.Item
            key={`${index}${amount}${category}`}
            title={`$${amount}`}
            description={category}
          />
        ))}
      </View>
    </PageWrapper>
  );
};

export default Transactions;
