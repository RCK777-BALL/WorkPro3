export const isCookieSecure = (): boolean => {
  if (process.env.COOKIE_SECURE !== undefined) {
    return process.env.COOKIE_SECURE === 'true';
  }
  return process.env.NODE_ENV === 'production';
};

export default isCookieSecure;
