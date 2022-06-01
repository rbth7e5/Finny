import React from 'react';
import WidgetWrapper from './WidgetWrapper';
import { Headline, Text } from 'react-native-paper';

const SummaryWidget = () => {
  return (
    <WidgetWrapper>
      <Text>You spent...</Text>
      <Headline>$100</Headline>
      <Text>this week</Text>
    </WidgetWrapper>
  );
};

export default SummaryWidget;
