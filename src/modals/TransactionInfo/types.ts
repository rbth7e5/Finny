import { Dispatch, SetStateAction } from 'react';

export type TransactionInfoProps = {
  transactionInfo: TransactionInfoType | null;
  setTransactionInfo: Dispatch<SetStateAction<TransactionInfoType | null>>;
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
