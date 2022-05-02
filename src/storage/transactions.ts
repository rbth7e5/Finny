import { createCRUD } from './utils';

export const TRANSACTION_ENTITY = {
  singular: 'transaction',
  plural: 'transactions',
};

export interface TransactionInfoType {
  id: string;
  amount?: number;
  description?: string;
  category?: string;
  icon?: string;
  timestamp: number;
}

const [
  createTransactions,
  readTransactions,
  updateTransactions,
  deleteTransactions,
] = createCRUD<TransactionInfoType>(
  TRANSACTION_ENTITY,
  transaction => transaction.id,
);

export {
  createTransactions,
  readTransactions,
  updateTransactions,
  deleteTransactions,
};
