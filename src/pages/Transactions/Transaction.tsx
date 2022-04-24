import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Caption, Surface, Text } from 'react-native-paper';
import moment from 'moment';
import { Layout, Shapes } from '../../styles';
import { TransactionInfoType } from '../../modals/TransactionInfo';

type TransactionProps = {
  transactionInfo: TransactionInfoType;
};

const displayTimestamp = (timestamp: number) => {
  const time = moment(timestamp);
  const now = moment();
  if (time.week() === now.week()) {
    return time.format('ddd');
  } else {
    return time.format('D MMM');
  }
};

const Transaction = ({
  transactionInfo: { amount, category, description, timestamp },
}: TransactionProps) => {
  return (
    <Surface style={styles.container}>
      <View style={styles.details}>
        <Text>${amount?.toFixed(2)}</Text>
        <Caption>{description ? description : category}</Caption>
      </View>
      <Text>{displayTimestamp(timestamp)}</Text>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    ...Layout.flexRow({
      justifyContent: 'space-between',
      alignItems: 'center',
    }),
    ...Layout.allPadded,
    ...Layout.marginBottomSmall,
    ...Shapes.rounded,
  },
  details: {
    ...Layout.flexColumn({
      justifyContent: 'center',
      alignItems: 'flex-start',
    }),
  },
});

export default Transaction;
