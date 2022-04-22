import React from 'react';
import { Text } from 'react-native-paper';
import PageWrapper from './pages/PageWrapper';
import { View } from 'react-native';

const Overview = () => {
  return (
    <PageWrapper>
      <View>
        <Text>Hello, Welcome to your overview!</Text>
      </View>
    </PageWrapper>
  );
};

export default Overview;
