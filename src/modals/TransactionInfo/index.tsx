import React, { useCallback } from 'react';
import { Modal, Portal, Text } from 'react-native-paper';
import { StyleSheet } from 'react-native';
import { Layout } from '../../styles';
import { TransactionInfoProps } from './types';

const TransactionInfo = ({
  transactionInfo,
  setTransactionInfo,
}: TransactionInfoProps) => {
  const onDismiss = useCallback(
    () => setTransactionInfo(null),
    [setTransactionInfo],
  );
  return (
    <Portal>
      <Modal
        visible={Boolean(transactionInfo)}
        onDismiss={onDismiss}
        contentContainerStyle={styles.container}>
        <Text>Transaction Info</Text>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  container: Layout.padded,
});

export default TransactionInfo;
export * from './types';
export * from './constants';
