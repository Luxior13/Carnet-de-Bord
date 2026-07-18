export type DashboardActivityItem = {
  action: string;
  category: string;
  createdAt: string;
  description: string;
  id: string;
  metadata: Record<string, unknown> | null;
  userName: string | null;
};

export type DashboardStats = {
  generatedAt: string;
  recentActivity: DashboardActivityItem[] | null;
  security: {
    lockedActiveUsers: number;
    mfaEnrollmentPendingActiveUsers: number;
    temporaryPasswordActiveUsers: number;
  } | null;
};
