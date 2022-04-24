import React from 'react';
import { View } from 'react-native';
import { Title } from 'react-native-paper';
import Transaction from './Transaction';
import { TransactionInfoType } from '../../modals/TransactionInfo';

type SectionProps = {
  title: string;
  transactions: TransactionInfoType[];
};

const Section = ({ title, transactions }: SectionProps) => {
  return (
    <View>
      <Title>{title}</Title>
      {transactions.map(transactionInfo => (
        <Transaction
          key={transactionInfo.id}
          transactionInfo={transactionInfo}
        />
      ))}
    </View>
  );
};

export default Section;
