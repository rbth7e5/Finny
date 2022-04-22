import React, { useCallback } from 'react';
import { Button, Card, Modal, Portal, TextInput } from 'react-native-paper';
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
        <Card>
          <Card.Title
            title={`${transactionInfo?.amount ? 'Edit' : 'Add'} Transaction`}
          />
          <Card.Content>
            <TextInput label="Amount" />
            <TextInput label="Category" />
          </Card.Content>
          <Card.Actions style={styles.actions}>
            <Button onPress={onDismiss}>Cancel</Button>
            <Button>Add</Button>
          </Card.Actions>
        </Card>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  container: Layout.padded,
  actions: Layout.flushRight,
});

export default TransactionInfo;
export * from './types';
export * from './constants';
