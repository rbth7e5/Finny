import { Dispatch, SetStateAction } from 'react';

export type TransactionInfoProps = {
  transactionInfo: TransactionInfoType | null;
  setTransactionInfo: Dispatch<SetStateAction<TransactionInfoType | null>>;
};

export type TransactionInfoType = {
  amount: number;
  category: string;
  icon: string;
};
