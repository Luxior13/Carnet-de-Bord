import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error('NOT_FOUND');
  }),
  SystemActivityJournalPage: vi.fn(() => null),
  SystemSettingsPage: vi.fn(() => null),
}));

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
}));

vi.mock('$features/audit/SystemActivityJournalPage', () => ({
  SystemActivityJournalPage: mocks.SystemActivityJournalPage,
}));

vi.mock('$features/settings/SystemSettingsPage', () => ({
  SystemSettingsPage: mocks.SystemSettingsPage,
}));

describe('/systeme route availability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects the removed system space root', async () => {
    const { default: SystemePage } =
      await import('$app/systeme/[[...slug]]/page');

    await expect(
      SystemePage({ params: Promise.resolve({ slug: [] }) }),
    ).rejects.toThrow('NOT_FOUND');
    expect(mocks.notFound).toHaveBeenCalledTimes(1);
  });

  it('renders the operational activity journal', async () => {
    const { default: SystemePage } =
      await import('$app/systeme/[[...slug]]/page');

    const result = await SystemePage({
      params: Promise.resolve({ slug: ['journal-activite'] }),
    });

    expect(result).toMatchObject({
      props: {
        item: expect.objectContaining({
          href: '/systeme/journal-activite',
        }),
        space: expect.objectContaining({ id: 'system' }),
      },
      type: mocks.SystemActivityJournalPage,
    });
    expect(mocks.notFound).not.toHaveBeenCalled();
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
