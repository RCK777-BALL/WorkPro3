import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MQTTState {
  url: string;
  username: string;
  password: string;
  setConfig: (cfg: Partial<Omit<MQTTState, 'setConfig'>>) => void;
}

export const useMQTTStore = create<MQTTState>()(
  persist(
    (set) => ({
      url: '',
      username: '',
      password: '',
      setConfig: (cfg) =>
        set((s) => ({
          ...s,
          ...cfg,
        })),
    }),
    { name: 'mqtt-config' }
  )
);
