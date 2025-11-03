import { useContext } from 'react';
import { useNDK as useNDKContext } from '@/lib/providers/ndk-provider';

export function useNDK() {
  return useNDKContext();
}