import React, { useCallback, useMemo, useState } from 'react';
import {
  Button,
  Card,
  FAB,
  Modal,
  Portal,
  TextInput,
} from 'react-native-paper';
import { StyleSheet } from 'react-native';
import useAdjustKeyboard from '../../hooks/useAdjustKeyboard';
import { Layout } from '../../styles';
import { addTransaction } from '../../storage';
import { TransactionInfoProps, TransactionInfoType } from './types';
import { generateDefaultTransaction } from './utils';

const NewTransactionFAB = ({ setTransactions }: TransactionInfoProps) => {
  const [transactionInfo, setTransactionInfo] =
    useState<TransactionInfoType | null>(null);
  const addNewTransaction = useCallback(() => {
    setTransactionInfo(generateDefaultTransaction());
  }, []);

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

  const [description, setDescription] = useState<string | undefined>(
    transactionInfo?.description,
  );

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
        description,
      };
      await addTransaction(newTransaction);
      setTransactions(oldTransactions => [newTransaction, ...oldTransactions]);
      setTransactionInfo(null);
    }
  }, [
    amount,
    category,
    description,
    isAmountValid,
    isCategoryValid,
    setTransactionInfo,
    setTransactions,
  ]);

  return (
    <>
      <FAB style={styles.fab} icon="plus" onPress={addNewTransaction} />
      <Portal>
        <Modal
          style={{ bottom: useAdjustKeyboard() }}
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
              <TextInput
                label="Description"
                value={description}
                onChangeText={value => setDescription(value)}
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
    </>
  );
};

const styles = StyleSheet.create({
  container: Layout.sidePadded,
  actions: Layout.flushRight,
  fab: {
    ...Layout.floating({ bottom: 16, right: 16 }),
    opacity: 0.8,
  },
});

export default NewTransactionFAB;
