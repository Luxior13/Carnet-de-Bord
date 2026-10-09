import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PERMISSIONS } from '$constants/permissions.constants';

const mocks = vi.hoisted(() => ({
  getPageAuthSession: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NOT_FOUND');
  }),
  redirect: vi.fn((href: string) => {
    throw new Error(`REDIRECT:${href}`);
  }),
  SystemSettingsPage: vi.fn(() => null),
}));

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  redirect: mocks.redirect,
}));

vi.mock('$server/auth', () => ({
  getPageAuthSession: mocks.getPageAuthSession,
}));

vi.mock('$features/settings/SystemSettingsPage', () => ({
  SystemSettingsPage: mocks.SystemSettingsPage,
}));

describe('/systeme route availability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    [null, '/login'],
    [
      { isProtected: true, permissions: {}, role: 'ADMIN' },
      '/systeme/utilisateurs',
    ],
    [
      {
        isProtected: false,
        permissions: { [PERMISSIONS.AUDIT.VIEW]: true },
        role: 'USER',
      },
      '/systeme/feuille-de-route',
    ],
    [
      {
        isProtected: false,
        permissions: { [PERMISSIONS.SETTINGS.VIEW]: true },
        role: 'USER',
      },
      '/systeme/feuille-de-route',
    ],
    [
      {
        isProtected: false,
        permissions: {
          [PERMISSIONS.AUDIT.VIEW]: false,
          [PERMISSIONS.USERS.VIEW]: false,
        },
        role: 'ADMIN',
      },
      '/systeme/parametres',
    ],
  ])('redirects the system root to an accessible page', async (user, href) => {
    mocks.getPageAuthSession.mockResolvedValue({ user });
    const { default: SystemePage } =
      await import('$app/systeme/[[...slug]]/page');

    await expect(
      SystemePage({ params: Promise.resolve({ slug: [] }) }),
    ).rejects.toThrow(`REDIRECT:${href}`);
    expect(mocks.notFound).not.toHaveBeenCalled();
  });

  it('rejects the removed activity journal destination', async () => {
    const { default: SystemePage } =
      await import('$app/systeme/[[...slug]]/page');

    await expect(
      SystemePage({ params: Promise.resolve({ slug: ['journal-activite'] }) }),
    ).rejects.toThrow('NOT_FOUND');
    expect(mocks.notFound).toHaveBeenCalledTimes(1);
  });

  it('renders the operational system settings page', async () => {
    const { default: SystemePage } =
      await import('$app/systeme/[[...slug]]/page');

    const result = await SystemePage({
      params: Promise.resolve({ slug: ['parametres'] }),
    });

    expect(result).toMatchObject({
      props: {
        item: expect.objectContaining({ href: '/systeme/parametres' }),
        space: expect.objectContaining({ id: 'system' }),
      },
      type: mocks.SystemSettingsPage,
    });
    expect(mocks.notFound).not.toHaveBeenCalled();
  });

  it.each([['modeles-documents']])(
    'rejects the planned destination /systeme/%s',
    async (slug) => {
      const { default: SystemePage } =
        await import('$app/systeme/[[...slug]]/page');

      await expect(
        SystemePage({ params: Promise.resolve({ slug: [slug] }) }),
      ).rejects.toThrow('NOT_FOUND');
      expect(mocks.notFound).toHaveBeenCalledTimes(1);
    },
  );

  it('rejects an unknown system destination', async () => {
    const { default: SystemePage } =
      await import('$app/systeme/[[...slug]]/page');

    await expect(
      SystemePage({ params: Promise.resolve({ slug: ['inconnue'] }) }),
    ).rejects.toThrow('NOT_FOUND');
    expect(mocks.notFound).toHaveBeenCalledTimes(1);
  });
});
