export const assertEmail = (
  email: unknown,
): asserts email is string => {
  if (typeof email !== 'string' || email.trim() === '') {
    throw new Error('Email is required');
  }
};

export default assertEmail;
