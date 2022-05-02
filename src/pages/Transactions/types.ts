import { Dispatch, SetStateAction } from 'react';
import { IdentifiableType } from '../../storage/utils';

export type GroupBy = 'day' | 'week' | 'month';

export type TransactionInfoProps = {
  setTransactions: Dispatch<SetStateAction<TransactionInfoType[]>>;
};

export interface TransactionInfoType extends IdentifiableType {
  id: string;
  amount?: number;
  description?: string;
  category?: string;
  icon?: string;
  timestamp: number;
}
