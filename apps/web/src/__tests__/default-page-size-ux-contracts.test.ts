import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const readSourceFile = (relativePath: string): string => {
  // Test-owned paths only; the helper never receives external input.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
};

const usersSource = readSourceFile('../features/users/UsersListPage.tsx');
const notificationsSource = readSourceFile(
  '../features/notifications/NotificationInboxPage.tsx',
);
const journalSource = readSourceFile(
  '../features/audit/SystemActivityJournalPage.tsx',
);
const userDetailSource = readSourceFile(
  '../components/users/UserDetailPage.tsx',
);
const accountSource = readSourceFile(
  '../features/account/AccountPageContent.tsx',
);
const historySource = readSourceFile(
  '../components/users/user-detail/UserHistoryTab.tsx',
);

describe('reviewed default page-size UX contracts', () => {
  it('lets list APIs apply ui.defaultPageSize instead of client constants', () => {
    expect(usersSource).not.toContain('USERS_PER_PAGE');
    expect(usersSource).toContain(
      'const effectivePageSizeRef = useRef<number | null>(null)',
    );
    expect(usersSource).toContain(
      'limit: page > 1 ? effectivePageSizeRef.current : null',
    );
    expect(usersSource).toContain(
      'effectivePageSizeRef.current = nextPagination.limit',
    );
    expect(notificationsSource).not.toMatch(
      /\/api\/notifications\?[^'`]*limit=/,
    );
    expect(journalSource).not.toMatch(/params\.set\(['"]limit['"]/);
  });

  it('lets activity APIs size displayed pages without background summary reads', () => {
    expect(userDetailSource).not.toContain('USER_AUDIT_PAGE_SIZE');
    expect(userDetailSource).not.toContain('USER_AUDIT_SUMMARY_PAGE_SIZE');
    expect(accountSource).not.toContain('ACCOUNT_AUDIT_PAGE_SIZE');
    expect(historySource).toContain(
      "const usesServerPagination = typeof onLoadMore === 'function'",
    );
  });
});
