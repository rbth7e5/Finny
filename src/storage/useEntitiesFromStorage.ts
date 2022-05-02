import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { ReadFunctionType } from './utils';

export default function useEntitiesFromStorage<T>(
  readEntities: ReadFunctionType<T>,
): [T[], Dispatch<SetStateAction<T[]>>, T[]] {
  const [initialEntities, setInitialEntities] = useState<T[]>([]);
  const [entities, setEntities] = useState<T[]>([]);
  useEffect(() => {
    let mounted = true;
    readEntities().then(data => {
      if (mounted) {
        setEntities(data);
        setInitialEntities(data);
      }
    });
    return () => {
      mounted = false;
    };
  }, [readEntities]);
  return [entities, setEntities, initialEntities];
}
