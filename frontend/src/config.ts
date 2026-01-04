export const getConfig = (name: string) => {
  return (window as any).__ENV__?.[name];
};
