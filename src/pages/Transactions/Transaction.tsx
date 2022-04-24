import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Caption, Surface, Text } from 'react-native-paper';
import moment from 'moment';
import { Layout, Shapes } from '../../styles';
import { TransactionInfoType } from '../../modals/TransactionInfo';
import { GroupBy } from './types';

type TransactionProps = {
  transactionInfo: TransactionInfoType;
  groupBy: GroupBy;
};

const displayTimestamp = (timestamp: number, groupBy: GroupBy) => {
  const time = moment(timestamp);
  switch (groupBy) {
    case 'day':
      return time.format('h:mm A');
    case 'week':
      return time.format('ddd');
    case 'month':
      return time.format('D MMM');
  }
};

const Transaction = ({
  transactionInfo: { amount, category, description, timestamp },
  groupBy,
}: TransactionProps) => {
  return (
    <Surface style={styles.container}>
      <View style={styles.details}>
        <Text>${amount?.toFixed(2)}</Text>
        <Caption>{description ? description : category}</Caption>
      </View>
      <Text>{displayTimestamp(timestamp, groupBy)}</Text>
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
