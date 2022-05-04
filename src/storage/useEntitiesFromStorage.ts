import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { ReadFunctionType } from './utils';

export default function useEntitiesFromStorage<T>(
  readEntities: ReadFunctionType<T>,
  dependencies?: any[],
): [T[], Dispatch<SetStateAction<T[]>>] {
  const [entities, setEntities] = useState<T[]>([]);
  useEffect(() => {
    let mounted = true;
    readEntities().then(data => {
      if (mounted) {
        setEntities(data);
      }
    });
    return () => {
      mounted = false;
    };
  }, [readEntities, dependencies]);
  return [entities, setEntities];
}
