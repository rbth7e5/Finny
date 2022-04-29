import { Dispatch, SetStateAction } from 'react';

export type GroupBy = 'day' | 'week' | 'month';

export type TransactionInfoProps = {
  setTransactions: Dispatch<SetStateAction<TransactionInfoType[]>>;
};
export type TransactionInfoType = {
  id: string;
  amount?: number;
  description?: string;
  category?: string;
  icon?: string;
  timestamp: number;
};
