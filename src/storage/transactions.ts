import AsyncStorage from '@react-native-async-storage/async-storage';
import { TransactionInfoType } from '../modals/TransactionInfo';

const TRANSACTION_STORAGE_KEY = '@transactions';

export const addTransaction = async (transaction: TransactionInfoType) => {
  try {
    const existingTransactionsRaw = await AsyncStorage.getItem(
      TRANSACTION_STORAGE_KEY,
    );
    if (existingTransactionsRaw) {
      const existingTransactions = JSON.parse(existingTransactionsRaw);
      const updatedTransactions = [transaction, existingTransactions];
      await AsyncStorage.setItem(
        TRANSACTION_STORAGE_KEY,
        JSON.stringify(updatedTransactions),
      );
    } else {
      await AsyncStorage.setItem(
        TRANSACTION_STORAGE_KEY,
        JSON.stringify([transaction]),
      );
    }
  } catch (error) {
    throw new Error('Failed to add transaction');
  }
};

export const getTransactions = async () => {
  try {
    const transactions = await AsyncStorage.getItem(TRANSACTION_STORAGE_KEY);
    if (transactions) {
      return transactions;
    }
    return [];
  } catch (error) {
    throw new Error('Failed to retrieve transactions');
  }
};
