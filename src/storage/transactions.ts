import AsyncStorage from '@react-native-async-storage/async-storage';
import { TransactionInfoType } from '../modals/TransactionInfo';

export const TRANSACTION_STORAGE_KEY = '@transactions';

export const addTransaction = async (transaction: TransactionInfoType) => {
  try {
    const existingTransactionsRaw = await AsyncStorage.getItem(
      TRANSACTION_STORAGE_KEY,
    );
    if (existingTransactionsRaw) {
      const existingTransactions = JSON.parse(existingTransactionsRaw);
      const updatedTransactions = [transaction, ...existingTransactions];
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

export const getTransactions = async (): Promise<TransactionInfoType[]> => {
  try {
    const transactions = await AsyncStorage.getItem(TRANSACTION_STORAGE_KEY);
    if (transactions) {
      return JSON.parse(transactions);
    }
    return [];
  } catch (error) {
    throw new Error('Failed to retrieve transactions');
  }
};

export const deleteTransactions = async (ids?: string[]) => {
  try {
    const transactionsRaw = await AsyncStorage.getItem(TRANSACTION_STORAGE_KEY);
    if (transactionsRaw) {
      const transactions: TransactionInfoType[] = JSON.parse(transactionsRaw);
      if (ids) {
        const remaining = transactions.filter(t => !ids.includes(t.id));
        await AsyncStorage.setItem(
          TRANSACTION_STORAGE_KEY,
          JSON.stringify(remaining),
        );
      } else {
        await AsyncStorage.setItem(TRANSACTION_STORAGE_KEY, JSON.stringify([]));
      }
    }
  } catch (error) {
    throw new Error('Failed to delete transactions');
  }
};
