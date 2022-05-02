import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Caption, Surface, Text } from 'react-native-paper';
import moment from 'moment';
import { Layout } from '../../styles';
import { GroupBy } from './types';
import { formatDateForWeek } from './utils';
import { TransactionInfoType } from '../../storage';

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
      return formatDateForWeek(time, 'week');
  }
};

const Transaction = memo(
  ({
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
  },
);

const styles = StyleSheet.create({
  container: {
    ...Layout.flexRow({
      justifyContent: 'space-between',
      alignItems: 'center',
    }),
    ...Layout.allPadded,
  },
  details: {
    ...Layout.flexColumn({
      justifyContent: 'center',
      alignItems: 'flex-start',
    }),
  },
});

export default Transaction;
