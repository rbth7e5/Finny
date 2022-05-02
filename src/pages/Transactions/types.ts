import { Dispatch, SetStateAction } from 'react';
import { TransactionInfoType } from '../../storage';

export type GroupBy = 'day' | 'week' | 'month';

export type TransactionInfoProps = {
  setTransactions: Dispatch<SetStateAction<TransactionInfoType[]>>;
};
