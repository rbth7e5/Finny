import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { getTransactions } from '../../storage';
import { TransactionInfoType } from './types';

export default function useTransactions(): [
  TransactionInfoType[],
  Dispatch<SetStateAction<TransactionInfoType[]>>,
] {
  const [transactions, setTransactions] = useState<TransactionInfoType[]>([]);
  useEffect(() => {
    let mounted = true;
    getTransactions().then(data => mounted && setTransactions(data));
    return () => {
      mounted = false;
    };
  }, []);
  return [transactions, setTransactions];
}
