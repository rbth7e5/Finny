import React from 'react';
import { StyleSheet, View } from 'react-native';
import SummaryWidget from './widgets/SummaryWidget';
import { Layout } from '../../styles';

const WidgetList = () => {
  return (
    <View style={styles.container}>
      <SummaryWidget />
      <SummaryWidget />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...Layout.sidePadded,
  },
});

export default WidgetList;
