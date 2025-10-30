import {
  submitAssetRequest,
  normalizeAssetData,
} from '../../../frontend/src/utils/assetSubmission';
import type { Asset } from '../../../frontend/src/types';

describe('asset submission helpers', () => {
  it('uses POST when creating a new asset', async () => {
    const httpClient = {
      post: jest.fn().mockResolvedValue({ data: { _id: 'asset-1', name: 'New Asset' } }),
      put: jest.fn(),
    };

    const payload = { name: 'New Asset' };

    const response = await submitAssetRequest({
      asset: null,
      files: [],
      payload,
      httpClient,
    });

    expect(httpClient.post).toHaveBeenCalledWith('/assets', payload);
    expect(httpClient.put).not.toHaveBeenCalled();
    expect(response).toEqual({ _id: 'asset-1', name: 'New Asset' });
  });

  it('uses PUT when updating an existing asset', async () => {
    const httpClient = {
      post: jest.fn(),
      put: jest.fn().mockResolvedValue({ data: { _id: 'asset-2', name: 'Updated Asset' } }),
    };

    const existing: Asset = { id: 'asset-2', name: 'Existing Asset' };
    const payload = { name: 'Updated Asset' };

    const response = await submitAssetRequest({
      asset: existing,
      files: [],
      payload,
      httpClient,
    });

    expect(httpClient.put).toHaveBeenCalledWith('/assets/asset-2', payload);
    expect(httpClient.post).not.toHaveBeenCalled();
    expect(response).toEqual({ _id: 'asset-2', name: 'Updated Asset' });
  });

  it('normalizes API responses into Asset shape', () => {
    const fallback: Asset = { id: 'asset-3', name: 'Fallback Asset' };
    const normalized = normalizeAssetData(
      { _id: 'asset-3', status: 'Active' },
      fallback,
    );

    expect(normalized.id).toBe('asset-3');
    expect(normalized.name).toBe('Fallback Asset');
    expect(normalized.status).toBe('Active');
    expect((normalized as any)._id).toBeUndefined();
  });
});

