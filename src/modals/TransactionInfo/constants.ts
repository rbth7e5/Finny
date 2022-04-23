import { TransactionInfoType } from './types';
import uuid from 'react-native-uuid';

export const generateDefaultTransaction = (): TransactionInfoType => ({
  id: uuid.v4() as string,
  category: 'food',
  icon: 'food',
  timestamp: new Date().getTime(),
});
