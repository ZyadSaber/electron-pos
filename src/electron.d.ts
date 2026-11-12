export {};

declare global {
  interface Window {
    electronAPI?: {
      verifyMasterKey: (masterKey: string) => Promise<{
        configured: boolean;
        authorized: boolean;
      }>;
    };
  }
}
