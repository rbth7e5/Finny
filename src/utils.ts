import { TransactionInfoType } from './modals/TransactionInfo';
import { groupBy } from 'lodash';
import moment from 'moment';

export const groupTransactionsByWeek = (
  transactions: TransactionInfoType[],
): Record<string, TransactionInfoType[]> => {
  return groupBy(transactions, t => {
    const date = moment(t.timestamp);
    const now = moment();
    if (now.week() === date.week()) {
      return 'This Week';
    }
    if (now.week() === date.week() + 1) {
      return 'Last Week';
    }
    const format = 'D MMM';
    const startOfWeek = date.startOf('week').format(format);
    const endOfWeek = date.endOf('week').format(format);
    return `${startOfWeek} - ${endOfWeek}`;
  });
};
