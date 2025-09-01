export const getEnvVar = (key: string): string | undefined => {
  const value = import.meta.env[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

export const config = {
  apiUrl: getEnvVar('VITE_API_URL'),
};
