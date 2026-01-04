declare global {
  interface Window {
    __ENV__?: {
      API_URL?: string;
      [key: string]: string | undefined;
    };
  }
}

export {};
