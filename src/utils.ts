import { TransactionInfoType } from './modals/TransactionInfo';
import { groupBy } from 'lodash';
import moment, { Moment } from 'moment';

export const groupTransactionsBy = (
  transactions: TransactionInfoType[],
  by: 'day' | 'week' | 'month',
): Record<string, TransactionInfoType[]> => {
  const formatBy = (date: Moment) => ({
    day: date.format('DD MMM YYYY'),
    week: `${date.startOf(by).format('DD MMM YYYY')} - ${date
      .endOf(by)
      .format('DD MMM YYYY')}`,
    month: date.format('MMM YYYY'),
  });

  return groupBy(transactions, t => {
    const date = moment(t.timestamp);
    const now = moment();
    if (formatBy(date)[by] === formatBy(now)[by]) {
      switch (by) {
        case 'day':
          return 'Today';
        case 'week':
          return 'This Week';
        case 'month':
          return 'This Month';
      }
    } else if (formatBy(date)[by] === formatBy(now.subtract(1, by))[by]) {
      switch (by) {
        case 'day':
          return 'Yesterday';
        case 'week':
          return 'Last Week';
        case 'month':
          return 'Last Month';
      }
    }

    return formatBy(date)[by];
  });
};
