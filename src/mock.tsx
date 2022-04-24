import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import { TransactionInfoType } from './modals/TransactionInfo';
import uuid from 'react-native-uuid';
import { deleteTransactions, TRANSACTION_STORAGE_KEY } from './storage';
import { View } from 'react-native';
import { Button } from 'react-native-paper';
import React from 'react';
import { Layout } from './styles';
import _ from 'lodash';

const generatePastMockTransactions = (
  amount: number,
  unit: moment.unitOfTime.DurationConstructor,
  number: number,
): TransactionInfoType[] => {
  const MOCK_LOCATIONS = [
    'Jurong Point Kopitiam',
    'Yakiniku LIKE',
    'Gong Cha',
    'KOI',
    'Monster Curry',
    'Geylang Serai Bazaar',
    'Kiseki Ramen',
    'Carousel @ Scotts',
    'Whale Tea',
    'Chinatown Suan-cai Fish',
    'Shake Shack',
    'Jollibee',
    'McDonalds',
    'Stuffd Kebab',
    'Safra Gym Membership',
    'Siloso Beach Hotel',
    'USS',
    'Kayaking',
    'Sea Aquarium',
  ];
  return [...Array(number).keys()].map(key => ({
    id: uuid.v4() as string,
    category: 'Food',
    description:
      MOCK_LOCATIONS[Math.floor(Math.random() * MOCK_LOCATIONS.length)],
    amount: Math.random() * 10 + key,
    timestamp: moment()
      .subtract(Math.floor(Math.random() * amount), unit)
      .valueOf(),
  }));
};

const MOCK_TRANSACTIONS: TransactionInfoType[] = _.sortBy(
  [
    ...generatePastMockTransactions(14, 'day', 56),
    ...generatePastMockTransactions(100, 'day', 200),
  ],
  t => -t.timestamp,
);

export const addMockTransactions = async () => {
  console.log(MOCK_TRANSACTIONS);
  await AsyncStorage.setItem(
    TRANSACTION_STORAGE_KEY,
    JSON.stringify(MOCK_TRANSACTIONS),
  );
};

export const MockButtons = () => (
  <View
    style={Layout.flexRow({
      justifyContent: 'space-between',
      alignItems: 'center',
    })}>
    <Button onPress={() => addMockTransactions()}>Mock</Button>
    <Button onPress={() => deleteTransactions()}>Delete</Button>
  </View>
);