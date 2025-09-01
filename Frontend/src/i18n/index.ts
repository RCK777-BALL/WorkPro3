import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export const resources = {
  en: {
    translation: {
      // Add your keys here, e.g.:
      'auth.register': 'Register',
      'auth.forgotPassword': 'Forgot Password?',
      'auth.login': 'Login',
      'auth.name': 'Name',
      'auth.email': 'Email',
      'auth.password': 'Password',
      'auth.tenantId': 'Tenant ID',
      'auth.employeeId': 'Employee ID',
      'auth.alreadyHaveAccount': 'Already have an account?',
      'auth.registrationFailed': 'Registration failed',
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;
