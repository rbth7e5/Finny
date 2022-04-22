import React, { useCallback, useState } from 'react';
import { Button, Card, Modal, Portal, TextInput } from 'react-native-paper';
import { StyleSheet } from 'react-native';
import { Layout } from '../../styles';
import { TransactionInfoProps, TransactionInfoType } from './types';
import { addTransaction } from '../../storage';

const TransactionInfo = ({
  transactionInfo,
  setTransactionInfo,
}: TransactionInfoProps) => {
  const [amount, setAmount] = useState<number | undefined>(
    transactionInfo?.amount,
  );
  const [category, setCategory] = useState<string | undefined>(
    transactionInfo?.category,
  );
  const onDismiss = useCallback(
    () => setTransactionInfo(null),
    [setTransactionInfo],
  );
  const onAdd = useCallback(async () => {
    const newTransaction: TransactionInfoType = {
      amount,
      category,
    };
    await addTransaction(newTransaction);
    setTransactionInfo(null);
  }, [amount, category, setTransactionInfo]);
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
            <TextInput
              label="Amount"
              keyboardType="numeric"
              value={amount === undefined ? '' : String(amount)}
              onChangeText={value => setAmount(+value)}
            />
            <TextInput
              label="Category"
              value={category}
              onChangeText={value => setCategory(value)}
            />
          </Card.Content>
          <Card.Actions style={styles.actions}>
            <Button onPress={onDismiss}>Cancel</Button>
            <Button onPress={onAdd}>Add</Button>
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
