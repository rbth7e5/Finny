import React, { Dispatch, SetStateAction } from 'react';
import { View } from 'react-native';
import { IconButton } from 'react-native-paper';
import moment from 'moment';
import _ from 'lodash';
import uuid from 'react-native-uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createCategories,
  createTransactions,
  deleteTransactions,
  TRANSACTION_ENTITY,
  TransactionInfoType,
} from './storage';
import { Layout } from './styles';

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

const MOCK_CATEGORIES: string[] = [
  'Drinks',
  'Food',
  'Shopping',
  'Pets',
  'Transport',
];

const MOCK_TRANSACTIONS: TransactionInfoType[] = _.sortBy(
  [
    ...generatePastMockTransactions(14, 'day', 56),
    ...generatePastMockTransactions(100, 'day', 200),
  ],
  t => -t.timestamp,
);

export const addMockTransactions = async () => {
  await createTransactions(MOCK_TRANSACTIONS);
  await createCategories(MOCK_CATEGORIES);
  return MOCK_TRANSACTIONS;
};

export const MockButtons = ({
  setTransactions,
}: {
  setTransactions: Dispatch<SetStateAction<TransactionInfoType[]>>;
}) => (
  <View
    style={Layout.flexRow({
      justifyContent: 'space-between',
      alignItems: 'center',
    })}>
    <IconButton
      icon="file"
      onPress={async () => setTransactions(await addMockTransactions())}
    />
    <IconButton
      icon="delete"
      onPress={async () => {
        await deleteTransactions();
        setTransactions([]);
      }}
    />
  </View>
);
