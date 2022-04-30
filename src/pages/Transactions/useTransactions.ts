import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { getTransactions } from '../../storage';
import { TransactionInfoType } from './types';

export default function useTransactions(): [
  TransactionInfoType[],
  Dispatch<SetStateAction<TransactionInfoType[]>>,
  TransactionInfoType[],
] {
  const [initialTransactions, setInitialTransactions] = useState<
    TransactionInfoType[]
  >([]);
  const [transactions, setTransactions] = useState<TransactionInfoType[]>([]);
  useEffect(() => {
    let mounted = true;
    getTransactions().then(data => {
      if (mounted) {
        setTransactions(data);
        setInitialTransactions(data);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);
  return [transactions, setTransactions, initialTransactions];
}
