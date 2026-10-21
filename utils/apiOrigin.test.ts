import { describe, expect, it } from 'vitest';
import { isApiOriginUrl } from './apiOrigin';

const API = 'https://api.loopcrm.app/api/v1';

describe('isApiOriginUrl', () => {
  it('accepts API URLs, including relative ones', () => {
    expect(isApiOriginUrl('https://api.loopcrm.app/api/v1/tenant-chat/messages/3/attachment/', API)).toBe(true);
    expect(isApiOriginUrl('/media/companies/1/x.png', API)).toBe(true);
  });

  it('resolves a relative API base against the page', () => {
    expect(isApiOriginUrl('https://app.loopcrm.app/api/v1/x/', '/api/v1', 'https://app.loopcrm.app/acme/chats')).toBe(true);
    expect(isApiOriginUrl('https://r2.example/x?X-Amz-Signature=a', '/api/v1', 'https://app.loopcrm.app/')).toBe(false);
  });

  it('rejects presigned object-storage URLs and other origins', () => {
    expect(
      isApiOriginUrl(
        'https://acc0unt.r2.cloudflarestorage.com/loop-crm-media/companies/1/x.png?X-Amz-Signature=abc',
        API,
      ),
    ).toBe(false);
    expect(isApiOriginUrl('http://api.loopcrm.app/api/v1/x', API)).toBe(false);
    expect(isApiOriginUrl('https://api.loopcrm.app:8443/x', API)).toBe(false);
  });
});
