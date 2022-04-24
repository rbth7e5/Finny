import { groupBy } from 'lodash';
import moment, { Moment } from 'moment';
import { GroupBy } from './types';
import { TransactionInfoType } from '../../modals/TransactionInfo';

export const groupTransactionsBy = (
  transactions: TransactionInfoType[],
  by: GroupBy,
): Record<string, TransactionInfoType[]> => {
  const format = (date: Moment) => ({
    day: date.format('DD MMM YYYY'),
    week: `${date
      .startOf(by === 'week' ? 'isoWeek' : by)
      .format('DD MMM YYYY')} - ${date
      .endOf(by === 'week' ? 'isoWeek' : by)
      .format('DD MMM YYYY')}`,
    month: date.format('MMM YYYY'),
  });

  return groupBy(transactions, t => {
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
};
