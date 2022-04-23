import React, { useCallback, useMemo, useState } from 'react';
import { Button, Card, Modal, Portal, TextInput } from 'react-native-paper';
import { StyleSheet } from 'react-native';
import { Layout } from '../../styles';
import { TransactionInfoProps, TransactionInfoType } from './types';
import { addTransaction } from '../../storage';
import { generateDefaultTransaction } from './constants';

const TransactionInfo = ({
  transactionInfo,
  setTransactionInfo,
}: TransactionInfoProps) => {
  const [amount, setAmount] = useState<string | undefined>(
    transactionInfo?.amount ? String(transactionInfo?.amount) : undefined,
  );
  const isAmountValid: boolean = useMemo(
    () => Boolean(amount && !isNaN(+amount)),
    [amount],
  );

  const [category, setCategory] = useState<string | undefined>(
    transactionInfo?.category,
  );
  const isCategoryValid: boolean = useMemo(() => Boolean(category), [category]);

  const onDismiss = useCallback(
    () => setTransactionInfo(null),
    [setTransactionInfo],
  );
  const onAdd = useCallback(async () => {
    if (isAmountValid && isCategoryValid) {
      const newTransaction: TransactionInfoType = {
        ...generateDefaultTransaction(),
        amount: +amount!,
        category,
      };
      await addTransaction(newTransaction);
      setTransactionInfo(null);
    }
  }, [amount, category, isAmountValid, isCategoryValid, setTransactionInfo]);

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
              error={!isAmountValid}
              value={amount}
              onChangeText={value => setAmount(value)}
            />
            <TextInput
              label="Category"
              error={!isCategoryValid}
              value={category}
              onChangeText={value => setCategory(value)}
            />
          </Card.Content>
          <Card.Actions style={styles.actions}>
            <Button onPress={onDismiss}>Cancel</Button>
            <Button
              onPress={onAdd}
              disabled={!isAmountValid || !isCategoryValid}>
              Add
            </Button>
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
