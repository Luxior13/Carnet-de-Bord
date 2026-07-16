export type DashboardActivityItem = {
  action: string;
  category: string;
  createdAt: string;
  description: string;
  id: string;
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
