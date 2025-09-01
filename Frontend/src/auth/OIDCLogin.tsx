import { useEffect, useState } from 'react';

type SSOConfig = {
  provider: 'okta' | 'azure';
  issuer?: string;
  clientId?: string;
};

interface Props {
  tenantId: string;
}

export default function OIDCLogin({ tenantId }: Props) {
  const [sso, setSso] = useState<SSOConfig | null>(null);

  useEffect(() => {
    fetch(`/api/tenants/${tenantId}`)
      .then((r) => r.json())
      .then((data) => setSso(data.sso))
      .catch(() => setSso(null));
  }, [tenantId]);

  if (!sso) return null;

  const handleLogin = () => {
    window.location.href = `/api/auth/oidc/${sso.provider}?tenant=${tenantId}`;
  };

  const label = sso.provider === 'okta' ? 'Login with Okta' : 'Login with Azure AD';

  return (
    <button onClick={handleLogin} className="btn-primary">
      {label}
    </button>
  );
}
