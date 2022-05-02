import AsyncStorage from '@react-native-async-storage/async-storage';

export interface EntityType {
  singular: string;
  plural: string;
}

export type CRUDFunctions<T> = [
  (items: T | T[]) => Promise<void>,
  (predicate?: (item: T) => boolean) => Promise<T[]>,
  (items: T | T[]) => Promise<void>,
  (ids?: (string | number)[]) => Promise<void>,
];

export function createCRUD<T>(
  { singular, plural }: EntityType,
  entityKey: (entity: T) => string | number,
): CRUDFunctions<T> {
  const key = singular;
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
      throw new Error(`Failed to retrieve ${plural}`);
    }
  };

  const create = async (items: T | T[]) => {
    const elements: T[] = ([] as T[]).concat(items);
    try {
      const existingTransactions = await read();
      const updatedTransactions = [...elements, ...existingTransactions];
      await AsyncStorage.setItem(key, JSON.stringify(updatedTransactions));
    } catch (error) {
      throw new Error(
        `Failed to add ${elements.length > 1 ? plural : singular}`,
      );
    }
  };

  const deleteItems = async (keys?: (string | number)[]) => {
    try {
      const remaining = keys
        ? await read(item => !keys.includes(entityKey(item)))
        : [];
      await AsyncStorage.setItem(key, JSON.stringify(remaining));
    } catch (error) {
      throw new Error(
        `Failed to delete ${key}${keys && keys.length > 1 ? plural : singular}`,
      );
    }
  };

  const update = async (items: T | T[]) => {
    const elements: T[] = ([] as T[]).concat(items);
    try {
      await deleteItems(elements.map(item => entityKey(item)));
      await create(items);
    } catch (error) {
      throw new Error(
        `Failed to update ${elements.length > 1 ? plural : singular}`,
      );
    }
  };

  return [create, read, update, deleteItems];
}
