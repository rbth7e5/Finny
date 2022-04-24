import React from 'react';
import { View } from 'react-native';
import { Title } from 'react-native-paper';
import Transaction from './Transaction';
import { TransactionInfoType } from '../../modals/TransactionInfo';
import { GroupBy } from './types';

type SectionProps = {
  title: string;
  transactions: TransactionInfoType[];
  groupBy: GroupBy;
};

const Section = ({ title, transactions, groupBy }: SectionProps) => {
  return (
    <View>
      <Title>{title}</Title>
      {transactions.map(transactionInfo => (
        <Transaction
          key={transactionInfo.id}
          transactionInfo={transactionInfo}
          groupBy={groupBy}
        />
      ))}
    </View>
  );
};

export default Section;
