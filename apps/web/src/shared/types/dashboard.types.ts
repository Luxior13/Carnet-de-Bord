export type DashboardActivityItem = {
  action: string;
  category: string;
  createdAt: string;
  description: string;
  id: string;
  userName: string | null;
};

export type DashboardStats = {
  recentActivity: DashboardActivityItem[];
  security: {
    lockedUsers: number;
    pendingPassword: number;
  };
  users: {
    active: number;
    inactive: number;
    recentLogins: number;
    total: number;
  };
};
