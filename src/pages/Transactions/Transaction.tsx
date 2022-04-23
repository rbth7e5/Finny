import React from 'react';
import { StyleSheet } from 'react-native';
import { Surface, Text } from 'react-native-paper';
import moment from 'moment';
import { Layout, Shapes } from '../../styles';
import { TransactionInfoType } from '../../modals/TransactionInfo';

type TransactionProps = {
  transactionInfo: TransactionInfoType;
};

const Transaction = ({
  transactionInfo: { amount, category, timestamp },
}: TransactionProps) => {
  return (
    <Surface style={styles.container}>
      <Text>${amount}</Text>
      <Text>{category}</Text>
      <Text>{moment(timestamp).format('h:mm A')}</Text>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    ...Layout.flexRow({
      justifyContent: 'space-between',
      alignItems: 'center',
    }),
    ...Layout.padded,
    ...Layout.marginBottomSmall,
    ...Shapes.rounded,
  },
});

export default Transaction;
