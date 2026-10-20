const now = "2026-10-11T10:30:00.000Z";
const makePerson = (id, values = {}) => ({
  id,
  firstName: "Camille",
  lastName: "Exemple",
  nickname: null,
  structureStatus: "IN_STRUCTURE",
  contactCounts: { emails: 1, phones: 0, socialProfiles: 2 },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: now,
  lastModifiedBy: { displayName: "Alex Exemple", loginName: "alex.exemple" },
  matchedByContact: false,
  version: 1,
  ...values,
});
exports.people = [
  makePerson("fiche-camille", { nickname: "CamilleJeu" }),
  makePerson("fiche-zoe", {
    firstName: "Zoé",
    lastName: "Martin",
    structureStatus: "OUTSIDE_STRUCTURE",
    contactCounts: { emails: 0, phones: 1, socialProfiles: 0 },
    lastModifiedBy: null,
  }),
  makePerson("fiche-vide", {
    firstName: null,
    lastName: null,
    nickname: null,
    contactCounts: { emails: 0, phones: 0, socialProfiles: 0 },
  }),
];
exports.response = (
  params = new URLSearchParams(),
  mode = "normal",
  revision = 0,
) => {
  let people = exports.people.map((person) => ({
    ...person,
    ...(revision ? { nickname: "VersionActualisée" } : {}),
  }));
  if (mode === "long")
    people = [
      makePerson("fiche-longue", {
        nickname: "Pseudo".repeat(13),
        firstName: "PrénomComposé".repeat(7),
        lastName: "NomTrèsLong".repeat(9),
        lastModifiedBy: {
          displayName: "ResponsableDeLaStructure".repeat(4),
          loginName: "compte.exemple",
        },
      }),
      ...people,
    ];
  if (mode === "paginated")
    people = Array.from({ length: 27 }, (_, index) =>
      makePerson(`fiche-${index + 1}`, {
        firstName: `Personne ${String(index + 1).padStart(2, "0")}`,
        nickname: null,
        ...(revision ? { lastName: "Actualisée" } : {}),
      }),
    );
  if (mode === "empty") people = [];
  let overview = {
    total: people.length,
    inStructure: people.filter((p) => p.structureStatus === "IN_STRUCTURE")
      .length,
    outsideStructure: people.filter(
      (p) => p.structureStatus === "OUTSIDE_STRUCTURE",
    ).length,
    noContacts: people.filter((p) =>
      Object.values(p.contactCounts).every((value) => value === 0),
    ).length,
  };
  if (mode === "long")
    overview = {
      total: 123456789,
      inStructure: 123456780,
      outsideStructure: 9,
      noContacts: 123456700,
    };
  const query = (params.get("q") || "").toLocaleLowerCase();
  if (query === "contact")
    people = people
      .filter((person) => person.contactCounts.emails > 0)
      .map((person) => ({ ...person, matchedByContact: true }));
  else if (query)
    people = people.filter((person) =>
      [person.nickname, person.firstName, person.lastName]
        .join(" ")
        .toLocaleLowerCase()
        .includes(query),
    );
  if (params.get("structureStatus"))
    people = people.filter(
      (person) => person.structureStatus === params.get("structureStatus"),
    );
  if (params.get("contacts") === "missing")
    people = people.filter((person) =>
      Object.values(person.contactCounts).every((value) => value === 0),
    );
  const total = people.length;
  const offset = params.get("cursor") === "page-2" ? 25 : 0;
  return {
    items: people.slice(offset, offset + 25),
    overview,
    pagination: {
      total,
      limit: 25,
      hasMore: total > offset + 25,
      nextCursor: total > offset + 25 ? "page-2" : null,
      snapshotAt: now,
    },
  };
};
