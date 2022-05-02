import AsyncStorage from '@react-native-async-storage/async-storage';

export interface IdentifiableType {
  id: string | number;
}

export type CRUDFunctions<T extends IdentifiableType> = [
  (items: T | T[]) => Promise<void>,
  (predicate?: (item: T) => boolean) => Promise<T[]>,
  (items: T | T[]) => Promise<void>,
  (ids?: (string | number)[]) => Promise<void>,
];

export function createCRUD<T extends IdentifiableType>(
  key: string,
): CRUDFunctions<T> {
  const read = async (predicate?: (item: T) => boolean): Promise<T[]> => {
    try {
      const existingTransactionsRaw = await AsyncStorage.getItem(key);
      if (existingTransactionsRaw) {
        const existingTransactions = JSON.parse(existingTransactionsRaw);
        if (predicate) {
          return existingTransactions.filter(predicate);
        }
        return existingTransactions;
      }
      return [];
    } catch (error) {
      throw new Error(`Failed to retrieve ${key}`);
    }
  };

  const create = async (items: T | T[]) => {
    const elements: T[] = ([] as T[]).concat(items);
    try {
      const existingTransactions = await read();
      const updatedTransactions = [...elements, ...existingTransactions];
      await AsyncStorage.setItem(key, JSON.stringify(updatedTransactions));
    } catch (error) {
      throw new Error(`Failed to add ${key}${elements.length > 1 ? 's' : ''}`);
    }
  };

  const deleteItems = async (ids?: (string | number)[]) => {
    try {
      const remaining = ids ? await read(item => !ids.includes(item.id)) : [];
      await AsyncStorage.setItem(key, JSON.stringify(remaining));
    } catch (error) {
      throw new Error(
        `Failed to delete ${key}${ids && ids.length > 1 ? 's' : ''}`,
      );
    }
  };

  const update = async (items: T | T[]) => {
    const elements: T[] = ([] as T[]).concat(items);
    try {
      await deleteItems(elements.map(item => item.id));
      await create(items);
    } catch (error) {
      throw new Error(`Failed to update ${key}`);
    }
  };

  return [create, read, update, deleteItems];
}
