import React from 'react';
import { Text } from 'react-native-paper';
import PageWrapper from './pages/PageWrapper';
import { View } from 'react-native';

const Transactions = () => {
  return (
    <PageWrapper>
      <View>
        <Text>Hello, Welcome to your transactions!</Text>
      </View>
    </PageWrapper>
  );
};

export default Transactions;
