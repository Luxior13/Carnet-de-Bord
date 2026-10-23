const stamp = "2026-10-12T12:00:00.000Z";
const row = (id, extra) => ({
  id,
  version: 1,
  createdAt: stamp,
  updatedAt: stamp,
  ...extra,
});
const person = {
  id: "audit-person-a",
  nickname: "CamilleAudit",
  firstName: "Camille",
  lastName: "Exemple",
  birthDate: "2000-01-02",
  age: 26,
  isAdult: true,
  structureStatus: "IN_STRUCTURE",
  createdAt: stamp,
  updatedAt: stamp,
  version: 1,
  lastChange: {
    action: "CREATE",
    at: stamp,
    actor: { displayName: "Auteur fictif", loginName: "auteur.audit" },
  },
  emails: [
    row("audit-email-a", {
      email: "camille@example.test",
      label: "Personnel",
      isPrimary: true,
    }),
    row("audit-email-b", {
      email: "autre@example.test",
      label: "Secondaire",
      isPrimary: false,
    }),
  ],
  phones: [
    row("audit-phone-a", {
      phone: "+33612345678",
      countryCode: "FR",
      label: "Personnel",
      isPrimary: true,
    }),
  ],
  socialProfiles: [
    row("audit-social-a", {
      identifier: "camille.audit",
      profileUrl: null,
      networkKey: "discord",
      label: "Personnel",
      isPrimary: true,
    }),
  ],
};
module.exports = { person, stamp };
