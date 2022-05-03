import AsyncStorage from '@react-native-async-storage/async-storage';

export interface EntityType {
  singular: string;
  plural: string;
}

export type CreateFunctionType<T> = (items: T | T[]) => Promise<void>;
export type ReadFunctionType<T> = (
  predicate?: (item: T) => boolean,
) => Promise<T[]>;
export type UpdateFunctionType<T> = (items: T | T[]) => Promise<void>;
export type DeleteFunctionType = (ids?: (string | number)[]) => Promise<void>;
export type CRUDFunctions<T> = [
  CreateFunctionType<T>,
  ReadFunctionType<T>,
  UpdateFunctionType<T>,
  DeleteFunctionType,
];

export function createCRUD<T>(
  { singular, plural }: EntityType,
  entityKey: (entity: T) => string | number,
): CRUDFunctions<T> {
  const key = singular;
  const read = async (predicate?: (item: T) => boolean): Promise<T[]> => {
    try {
      const existingEntitiesRaw = await AsyncStorage.getItem(key);
      if (existingEntitiesRaw) {
        const existingEntities = JSON.parse(existingEntitiesRaw);
        if (predicate) {
          return existingEntities.filter(predicate);
        }
        return existingEntities;
      }
      return [];
    } catch (error) {
      throw new Error(`Failed to retrieve ${plural}`);
    }
  };

  const create = async (items: T | T[]) => {
    const elements: T[] = ([] as T[]).concat(items);
    try {
      const existingEntities = await read();
      const existingKeys = existingEntities.map(e => entityKey(e));
      const deDupedElements = elements.filter(
        e => !existingKeys.includes(entityKey(e)),
      );
      const updatedEntities = [...deDupedElements, ...existingEntities];
      await AsyncStorage.setItem(key, JSON.stringify(updatedEntities));
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
