import DashboardPageClient from '$features/dashboard/components/DashboardPageClient';
import {
  getDashboardAccess,
  loadDashboardStats,
} from '$features/dashboard/server/dashboard.service';
import { getPageAuthSession } from '$server/auth';
import type { DashboardStats } from '$types/dashboard.types';

export default async function HomePage(): Promise<React.ReactNode> {
  const { user } = await getPageAuthSession();
  let initialStats: DashboardStats | undefined;

  if (user) {
    const access = getDashboardAccess(user);
    if (
      access.canViewDashboard &&
      (access.canViewUserSecurity || access.canViewRecentActivity)
    ) {
      try {
        initialStats = await loadDashboardStats(user);
      } catch {
        // The client keeps the established retry state if the initial server
        // snapshot cannot be generated safely.
      }
    }
  }

  return <DashboardPageClient initialStats={initialStats} />;
}
