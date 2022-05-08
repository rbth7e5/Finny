import React from 'react';
import WidgetWrapper from './WidgetWrapper';
import { Text } from 'react-native-paper';

const SummaryWidget = () => {
  return (
    <WidgetWrapper>
      <Text>You spent...</Text>
      <Text>$100 this week</Text>
      <Text>$900 this month</Text>
    </WidgetWrapper>
  );
};

export default SummaryWidget;
