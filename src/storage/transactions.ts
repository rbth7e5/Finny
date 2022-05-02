import { TransactionInfoType } from '../pages/Transactions';
import { createCRUD } from './utils';

export const TRANSACTION_STORAGE_KEY = 'transaction';

const [
  createTransactions,
  readTransactions,
  updateTransactions,
  deleteTransactions,
] = createCRUD<TransactionInfoType>(TRANSACTION_STORAGE_KEY);

export {
  createTransactions,
  readTransactions,
  updateTransactions,
  deleteTransactions,
};
