import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import * as api from '@/lib/api';

export function useInitData() {
  const { setSubjects } = useAppStore();

  useEffect(() => {
    api.subjects.list()
      .then(setSubjects)
      .catch((err) => console.error('Error loading subjects:', err));
  }, []);
}
