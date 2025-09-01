import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import LoginPage from '../pages/LoginPage';
import i18n from '../i18n';

describe('i18n integration', () => {
  it('switches languages for LoginPage links', async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </I18nextProvider>
    );

    expect(screen.getByText('Register')).toBeInTheDocument();
    i18n.changeLanguage('es');
    expect(await screen.findByText('Registrarse')).toBeInTheDocument();
    i18n.changeLanguage('en');
  });
});

