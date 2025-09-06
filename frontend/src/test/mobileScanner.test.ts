import { describe, it, expect, vi } from 'vitest';
import { scanQRCode } from '../utils/qr';
import api from '../lib/api';

vi.mock('../lib/api', () => ({
  default: vi.fn(),
}));

vi.mock('@zxing/browser', () => {
  return {
    BrowserQRCodeReader: vi.fn().mockImplementation(() => ({
      decodeOnceFromVideoDevice: vi.fn().mockResolvedValue({ getText: () => 'asset-123' }),
      reset: vi.fn(),
    })),
  };
});

describe('mobile scanner', () => {
  it('looks up asset by scanned code', async () => {
    const video = document.createElement('video');
    const apiMock = api as unknown as ReturnType<typeof vi.fn>;
    (apiMock as any).mockResolvedValue({});
    const code = await scanQRCode(video);
    await api({ method: 'get', url: `/assets/${code}` });
    expect(apiMock).toHaveBeenCalledWith({ method: 'get', url: '/assets/asset-123' });
  });

  it('handles scan errors', async () => {
    const video = document.createElement('video');
    const reader = {
      decodeOnceFromVideoDevice: vi.fn().mockRejectedValue(new Error('fail')),
      reset: vi.fn(),
    };
    const BrowserQRCodeReader = (await import('@zxing/browser')).BrowserQRCodeReader as any;
    BrowserQRCodeReader.mockImplementation(() => reader);
    await expect(scanQRCode(video)).rejects.toThrow('fail');
  });
});
