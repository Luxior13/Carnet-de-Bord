const makeUser = (id, values = {}) => ({
  id,
  firstName: "Camille",
  lastName: "Exemple",
  loginName: "camille.exemple",
  contactEmail: "camille@example.test",
  contactEmailVerifiedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-10-11T10:00:00.000Z",
  failedLoginAttempts: 0,
  identityDetailsVisible: true,
  isActive: true,
  isProtected: false,
  lastLoginAt: "2026-10-11T12:00:00.000Z",
  lockedUntil: null,
  mfaEnabledAt: null,
  mustChangePassword: false,
  passwordChangedAt: "2026-01-01T00:00:00.000Z",
  permissions: {},
  role: "USER",
  securityDetailsVisible: true,
  ...values,
});
exports.users = [
  makeUser("audit-users-viewer"),
  makeUser("user-zoe", {
    firstName: "Zoé",
    lastName: "Martin",
    loginName: "zoe.martin",
    contactEmail: null,
    role: "ADMIN",
    isActive: false,
    mustChangePassword: true,
    lastLoginAt: null,
  }),
  makeUser("user-protected", {
    firstName: "Compte",
    lastName: "racine",
    loginName: "••••••••",
    contactEmail: null,
    role: "ADMIN",
    isProtected: true,
    identityDetailsVisible: false,
    securityDetailsVisible: false,
    lastLoginAt: null,
  }),
];
exports.response = (
  params = new URLSearchParams(),
  options = {},
  revision = 0,
) => {
  let users = exports.users.map((user) => ({
    ...user,
    ...(revision && user.identityDetailsVisible
      ? { lastName: "Actualisée" }
      : {}),
  }));
  if (options.mode === "paginated")
    users = Array.from({ length: 47 }, (_, index) =>
      makeUser(`user-${index + 1}`, {
        firstName: `Compte ${String(index + 1).padStart(2, "0")}`,
        loginName: `compte.${index + 1}`,
        contactEmail: `compte.${index + 1}@example.test`,
      }),
    );
  if (options.mode === "long")
    users = [
      makeUser("user-long", {
        firstName: "PrénomComposé".repeat(4),
        lastName: "NomTrèsLong".repeat(5),
        loginName: "identifiant".repeat(3).slice(0, 32),
        contactEmail: "adresse.contact.".repeat(3) + "@example.test",
        lastLoginAt: "2024-06-15T12:00:00.000Z",
      }),
      ...users,
    ];
  if (options.mode === "empty") users = [];
  const securityDetailsVisible =
    options.columns !== "base" && options.columns !== "contact";
  const canContact =
    options.columns !== "base" && options.columns !== "security";
  const search = (params.get("search") || "").toLocaleLowerCase();
  if (search)
    users = users.filter((u) =>
      [
        u.firstName,
        u.lastName,
        u.loginName,
        ...(canContact ? [u.contactEmail] : []),
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(search),
    );
  const status = params.get("status");
  const role = params.get("role");
  const statusMatch = {
    active: (u) => u.isActive,
    inactive: (u) => !u.isActive,
    pending: (u) => u.mustChangePassword,
  };
  const roleMatch = {
    SUPERADMIN: (u) => u.isProtected,
    ADMIN: (u) => u.role === "ADMIN" && !u.isProtected,
    USER: (u) => u.role === "USER" && !u.isProtected,
  };
  const inStatus = statusMatch[status] ?? (() => true);
  const inRole = roleMatch[role] ?? (() => true);
  // Facettes comme le serveur : après la recherche, chaque état garde le rôle
  // choisi, et chaque rôle garde l'état choisi.
  const countStatus = (match) => users.filter((u) => match(u) && inRole(u)).length;
  const countRole = (match) => users.filter((u) => match(u) && inStatus(u)).length;
  let stats = {
    total: countStatus(() => true),
    active: countStatus(statusMatch.active),
    inactive: countStatus(statusMatch.inactive),
    pendingPasswordChange: securityDetailsVisible
      ? countStatus(statusMatch.pending)
      : null,
    byRole: {
      SUPERADMIN: countRole(roleMatch.SUPERADMIN),
      ADMIN: countRole(roleMatch.ADMIN),
      USER: countRole(roleMatch.USER),
    },
  };
  if (options.mode === "long")
    stats = {
      total: 123456789,
      active: 123456780,
      inactive: 9,
      pendingPasswordChange: securityDetailsVisible ? 123456700 : null,
      byRole: { SUPERADMIN: 1, ADMIN: 123456000, USER: 788 },
    };
  users = users.filter((u) => inStatus(u) && inRole(u));
  const total = users.length;
  const limit = Number(params.get("limit") || 25);
  const page = Number(params.get("page") || 1);
  users = users
    .slice((page - 1) * limit, page * limit)
    .map((u) => ({
      ...u,
      ...(!canContact ? { contactEmail: null } : {}),
      ...(!securityDetailsVisible
        ? { mustChangePassword: false, securityDetailsVisible: false }
        : {}),
    }));
  return {
    users,
    stats,
    securityDetailsVisible,
    pagination: { page, total, limit, totalPages: Math.ceil(total / limit) },
  };
};
