import { groupBy } from 'lodash';
import moment, { Moment } from 'moment';
import { GroupBy, TransactionInfoType } from './types';
import uuid from 'react-native-uuid';

export const formatDateForWeek = (date: moment.Moment, by: GroupBy) => {
  const start = date.clone().startOf(by === 'week' ? 'isoWeek' : by);
  const end = date.clone().endOf(by === 'week' ? 'isoWeek' : by);
  return `${start.format('DD MMM YYYY')} - ${end.format('DD MMM YYYY')}`;
};

export const groupTransactionsBy = (
  transactions: TransactionInfoType[],
  by: GroupBy,
): Record<string, TransactionInfoType[]> => {
  const format = (date: Moment) => ({
    day: date.format('DD MMM YYYY'),
    week: formatDateForWeek(date, by),
    month: date.format('MMM YYYY'),
  });

  const result = groupBy(transactions, t => {
    const date = moment(t.timestamp);
    const now = moment();
    if (format(date)[by] === format(now)[by]) {
      switch (by) {
        case 'day':
          return 'Today';
        case 'week':
          return 'This Week';
        case 'month':
          return 'This Month';
      }
    } else if (format(date)[by] === format(now.subtract(1, by))[by]) {
      switch (by) {
        case 'day':
          return 'Yesterday';
        case 'week':
          return 'Last Week';
        case 'month':
          return 'Last Month';
      }
    }

    return format(date)[by];
  });
  if (by === 'day') {
    return result;
  }
  return consolidateTransactionsFor(result, by === 'week' ? 'day' : 'week');
};

export const consolidateTransactionsFor = (
  transactionsBy: Record<string, TransactionInfoType[]>,
  by: 'day' | 'week',
): Record<string, TransactionInfoType[]> => {
  return Object.entries(transactionsBy).reduce(
    (result, [week, transactionsInWeek]) => {
      const transactionsInWeekByDay = groupTransactionsBy(
        transactionsInWeek,
        by,
      );
      result[week] = Object.entries(transactionsInWeekByDay).reduce(
        (consolidated, [, transactionsInDay]) => {
          consolidated.push(
            transactionsInDay.reduce((finalTransaction, currTransaction) => ({
              id: currTransaction.id,
              amount:
                (finalTransaction.amount || 0) + (currTransaction.amount || 0),
              timestamp: currTransaction.timestamp,
            })),
          );
          return consolidated;
        },
        [] as TransactionInfoType[],
      );
      return result;
    },
    {} as Record<string, TransactionInfoType[]>,
  );
};

export const searchTransactions = (
  transactions: TransactionInfoType[],
  searchText: string,
): TransactionInfoType[] => {
  return transactions.filter(
    transaction =>
      transaction.description
        ?.toLowerCase()
        .includes(searchText.toLowerCase()) ||
      transaction.category?.toLowerCase().includes(searchText.toLowerCase()),
  );
};

export const generateDefaultTransaction = (): TransactionInfoType => ({
  id: uuid.v4() as string,
  category: 'food',
  icon: 'food',
  timestamp: new Date().getTime(),
});
