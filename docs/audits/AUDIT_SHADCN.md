# Inventaire UI et shadcn — 22 septembre 2026

> Rapport historique : résultats valables pour la passe décrite, non rejoués par
> la correction documentaire. Voir [l’index](README.md) et les [suivis courants](../qualite/pages/README.md).
> Les chemins indiqués comme historiques peuvent désigner des fichiers retirés.

## Ce que signifie « tout en shadcn » dans ce projet

Les contrôles visibles utilisent les primitives locales de `components/ui`.
Les pages et composants métier les composent. Un hero, une fiche utilisateur,
un formulaire MFA ou un éditeur d'autorisations ne sont pas des composants
standards du catalogue shadcn : leur disposition reste propre au produit.

shadcn distribue du code source modifiable, pas une bibliothèque d'exécution
unique appelée « shadcn ». La configuration est dans `apps/web/components.json`.
Le style est `new-york`, avec variables CSS et icônes Lucide. Les nouveaux
`Avatar`, `Command`, `Alert` et `Empty` proviennent du registre officiel,
adaptés aux imports Radix individuels et aux jetons du site.

Références : [philosophie shadcn](https://ui.shadcn.com/docs),
[Command](https://ui.shadcn.com/docs/components/command),
[Sidebar](https://ui.shadcn.com/docs/components/sidebar).

## Répartition des responsabilités

| Niveau                             | Responsabilité                                                   |
| ---------------------------------- | ---------------------------------------------------------------- |
| `globals.css`                      | Palette, surfaces, typographie, géométrie globale, accessibilité |
| `components/ui`                    | Primitives, variantes, focus et interactions communes            |
| `components/layout`                | Titres, sections, navigation et états composés                   |
| `features/*` et `components/users` | Formulaires et vues métier, sans palette parallèle               |
| `app/*`                            | Assemblage des routes et accès                                   |

`PageHero` est une composition HTML sémantique et `ServiceIcon` un habillage
non interactif. `SectionPanel` et `AccountPanel` composent `Card`.
`Disclosure` compose `Collapsible` et `Button`. `ContentState` compose `Alert`
ou `Empty`. `DiceBearAvatar` fournit l'image et le secours à `Avatar`.
`DataTableSection` et la pagination composent les primitives de tableau et bouton.

Les contrôles natifs visibles (`button`, `input`, `select`, `textarea`, `label`,
`details`, `summary`, `progress`) sont interdits hors du répertoire UI par le
test AST `shadcn-boundaries.test.ts`. Les six champs `input` invisibles servant
d'indice `autoComplete="username"` dans les parcours sensibles sont conservés :
ils sont masqués, non focalisables, en lecture seule et exclus de l'arbre
d'accessibilité. Le test vérifie ces attributs, sans exemption générale de fichier.

Les liens, titres, formulaires, listes et régions restent des éléments
sémantiques. Un lien de fiche est composé avec `Button asChild` ; une carte-lien
avec `Card asChild`. Les toasts restent sur le composant Sonner déjà intégré.

## Lecture de l'inventaire

La table ci-dessous recense tous les fichiers TSX du périmètre applicatif au
moment de l'audit. La dernière colonne liste les modules UI importés directement,
pas toutes leurs dépendances transitives. « Composition / infrastructure » peut
donc correspondre à une page qui délègue entièrement son rendu à une autre vue,
à un contexte, à un composant sémantique ou à une redirection.

Cet inventaire atteste le périmètre des sources, pas une recette authentifiée de
chaque état métier. Le détail des contrôles navigateur et leurs limites figure
dans [AUDIT_DESIGN.md](AUDIT_DESIGN.md).

<!-- inventory -->

129 fichiers TSX ; 17 fichiers de route page.tsx.

| Fichier                                                                                                                                            | Modules UI directs                                                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| [app/administration/page.tsx](../../apps/web/src/app/administration/page.tsx)                                                                         | Composition / infrastructure                                                                          |
| app/administration/utilisateurs/[id]/loading.tsx — chemin historique : `apps/web/src/app/administration/utilisateurs/[id]/loading.tsx`                               | Composition / infrastructure                                                                          |
| app/administration/utilisateurs/[id]/page.tsx — chemin historique : `apps/web/src/app/administration/utilisateurs/[id]/page.tsx`                                     | Composition / infrastructure                                                                          |
| app/administration/utilisateurs/layout.tsx — chemin historique : `apps/web/src/app/administration/utilisateurs/layout.tsx`                                           | Composition / infrastructure                                                                          |
| app/administration/utilisateurs/nouveau/page.tsx — chemin historique : `apps/web/src/app/administration/utilisateurs/nouveau/page.tsx`                               | `badge`, `button`, `card`, `input`, `label`, `page-shell`, `select`, `separator`                      |
| app/administration/utilisateurs/page.tsx — chemin historique : `apps/web/src/app/administration/utilisateurs/page.tsx`                                               | `button`, `page-shell`, `skeleton`                                                                    |
| [app/error.tsx](../../apps/web/src/app/error.tsx)                                                                                                     | `button`, `card`                                                                                      |
| app/feuille-de-route/page.tsx — chemin historique : `apps/web/src/app/feuille-de-route/page.tsx`                                                                     | `badge`, `card`, `page-shell`, `service-icon`                                                         |
| [app/layout.tsx](../../apps/web/src/app/layout.tsx)                                                                                                   | `sonner`                                                                                              |
| [app/loading.tsx](../../apps/web/src/app/loading.tsx)                                                                                                 | `page-shell`, `skeleton`                                                                              |
| [app/login/page.tsx](../../apps/web/src/app/login/page.tsx)                                                                                           | `button`, `card`, `checkbox`, `input`, `label`                                                        |
| app/mes-notifications/page.tsx — chemin historique : `apps/web/src/app/mes-notifications/page.tsx`                                                                   | Composition / infrastructure                                                                          |
| [app/mon-compte/layout.tsx](../../apps/web/src/app/mon-compte/layout.tsx)                                                                             | Composition / infrastructure                                                                          |
| [app/mon-compte/page.tsx](../../apps/web/src/app/mon-compte/page.tsx)                                                                                 | `page-shell`                                                                                          |
| [app/not-found.tsx](../../apps/web/src/app/not-found.tsx)                                                                                             | `button`, `card`, `service-icon`                                                                      |
| [app/page.tsx](../../apps/web/src/app/page.tsx)                                                                                                       | Composition / infrastructure                                                                          |
| app/recherche/page.tsx — chemin historique : `apps/web/src/app/recherche/page.tsx`                                                                                   | `page-shell`                                                                                          |
| [app/systeme/[[...slug]]/page.tsx](../../apps/web/src/app/systeme/[[...slug]]/page.tsx)                                                               | Composition / infrastructure                                                                          |
| [app/tableau-de-bord/[[...slug]]/page.tsx](../../apps/web/src/app/tableau-de-bord/[[...slug]]/page.tsx)                                               | Composition / infrastructure                                                                          |
| app/tableau-de-bord/mes-notifications/page.tsx — chemin historique : `apps/web/src/app/tableau-de-bord/mes-notifications/page.tsx`                                   | Composition / infrastructure                                                                          |
| app/vie-interne/actualite-interne/page.tsx — chemin historique : `apps/web/src/app/vie-interne/actualite-interne/page.tsx`                                           | `page-shell`, `skeleton`                                                                              |
| app/vie-interne/repertoire/[id]/loading.tsx — chemin historique : `apps/web/src/app/vie-interne/repertoire/[id]/loading.tsx`                                         | `page-shell`, `skeleton`                                                                              |
| app/vie-interne/repertoire/[id]/page.tsx — chemin historique : `apps/web/src/app/vie-interne/repertoire/[id]/page.tsx`                                               | Composition / infrastructure                                                                          |
| app/vie-interne/repertoire/nouveau/page.tsx — chemin historique : `apps/web/src/app/vie-interne/repertoire/nouveau/page.tsx`                                         | `page-shell`, `skeleton`                                                                              |
| app/vie-interne/repertoire/page.tsx — chemin historique : `apps/web/src/app/vie-interne/repertoire/page.tsx`                                                         | Composition / infrastructure                                                                          |
| [components/AuthenticatedLayout.tsx](../../apps/web/src/components/AuthenticatedLayout.tsx)                                                           | `breadcrumb`, `button`, `sidebar`                                                                     |
| [components/ChangePasswordDialog.tsx](../../apps/web/src/components/ChangePasswordDialog.tsx)                                                         | `button`, `dialog`, `input`, `label`, `service-icon`                                                  |
| [components/Sidebar.tsx](../../apps/web/src/components/Sidebar.tsx)                                                                                   | `button`, `collapsible`, `dropdown-menu`, `sidebar`, `tooltip`                                        |
| [components/layout/ContentState.tsx](../../apps/web/src/components/layout/ContentState.tsx)                                                           | `alert`, `empty`                                                                                      |
| [components/layout/Disclosure.tsx](../../apps/web/src/components/layout/Disclosure.tsx)                                                               | `button`, `collapsible`                                                                               |
| [components/layout/EntityDangerZone.tsx](../../apps/web/src/components/layout/EntityDangerZone.tsx)                                                   | `alert-dialog`, `button`, `card`                                                                      |
| [components/layout/EntityDetailLayout.tsx](../../apps/web/src/components/layout/EntityDetailLayout.tsx)                                               | `page-shell`                                                                                          |
| [components/layout/GlobalSearch.tsx](../../apps/web/src/components/layout/GlobalSearch.tsx)                                                           | `badge`, `button`, `command`, `dialog`                                                                |
| [components/layout/Header.tsx](../../apps/web/src/components/layout/Header.tsx)                                                                       | `breadcrumb`, `sidebar`                                                                               |
| components/layout/NotificationCenter.tsx — chemin historique : `apps/web/src/components/layout/NotificationCenter.tsx`                                               | `button`, `popover`                                                                                   |
| components/layout/PageBackNavigation.tsx — chemin historique : `apps/web/src/components/layout/PageBackNavigation.tsx`                                               | `button`                                                                                              |
| [components/layout/PageHero.tsx](../../apps/web/src/components/layout/PageHero.tsx)                                                                   | `service-icon`                                                                                        |
| [components/layout/PageState.tsx](../../apps/web/src/components/layout/PageState.tsx)                                                                 | `button`, `card`, `page-shell`, `service-icon`                                                        |
| [components/layout/ResourceStateBoundary.tsx](../../apps/web/src/components/layout/ResourceStateBoundary.tsx)                                         | `button`                                                                                              |
| [components/layout/SectionPanel.tsx](../../apps/web/src/components/layout/SectionPanel.tsx)                                                           | `card`, `service-icon`                                                                                |
| [components/layout/UnsavedNavigationDialog.tsx](../../apps/web/src/components/layout/UnsavedNavigationDialog.tsx)                                     | `alert-dialog`                                                                                        |
| [components/observability/WebVitalsReporter.tsx](../../apps/web/src/components/observability/WebVitalsReporter.tsx)                                   | Composition / infrastructure                                                                          |
| [components/ui/alert-dialog.tsx](../../apps/web/src/components/ui/alert-dialog.tsx)                                                                   | `button`                                                                                              |
| [components/ui/alert.tsx](../../apps/web/src/components/ui/alert.tsx)                                                                                 | Primitive / composition UI                                                                            |
| [components/ui/avatar.tsx](../../apps/web/src/components/ui/avatar.tsx)                                                                               | Primitive / composition UI                                                                            |
| [components/ui/badge.tsx](../../apps/web/src/components/ui/badge.tsx)                                                                                 | Primitive / composition UI                                                                            |
| [components/ui/breadcrumb.tsx](../../apps/web/src/components/ui/breadcrumb.tsx)                                                                       | `dropdown-menu`                                                                                       |
| [components/ui/button.tsx](../../apps/web/src/components/ui/button.tsx)                                                                               | Primitive / composition UI                                                                            |
| [components/ui/card.tsx](../../apps/web/src/components/ui/card.tsx)                                                                                   | Primitive / composition UI                                                                            |
| [components/ui/checkbox.tsx](../../apps/web/src/components/ui/checkbox.tsx)                                                                           | Primitive / composition UI                                                                            |
| [components/ui/collapsible.tsx](../../apps/web/src/components/ui/collapsible.tsx)                                                                     | Primitive / composition UI                                                                            |
| [components/ui/command.tsx](../../apps/web/src/components/ui/command.tsx)                                                                             | Primitive / composition UI                                                                            |
| [components/ui/data-table-section.tsx](../../apps/web/src/components/ui/data-table-section.tsx)                                                       | `card`, `pagination`                                                                                  |
| [components/ui/dialog.tsx](../../apps/web/src/components/ui/dialog.tsx)                                                                               | Primitive / composition UI                                                                            |
| [components/ui/dicebear-avatar.tsx](../../apps/web/src/components/ui/dicebear-avatar.tsx)                                                             | `avatar`                                                                                              |
| [components/ui/dropdown-menu.tsx](../../apps/web/src/components/ui/dropdown-menu.tsx)                                                                 | Primitive / composition UI                                                                            |
| [components/ui/empty.tsx](../../apps/web/src/components/ui/empty.tsx)                                                                                 | Primitive / composition UI                                                                            |
| [components/ui/input.tsx](../../apps/web/src/components/ui/input.tsx)                                                                                 | Primitive / composition UI                                                                            |
| [components/ui/label.tsx](../../apps/web/src/components/ui/label.tsx)                                                                                 | Primitive / composition UI                                                                            |
| [components/ui/page-shell.tsx](../../apps/web/src/components/ui/page-shell.tsx)                                                                       | Primitive / composition UI                                                                            |
| [components/ui/pagination.tsx](../../apps/web/src/components/ui/pagination.tsx)                                                                       | `button`                                                                                              |
| [components/ui/popover.tsx](../../apps/web/src/components/ui/popover.tsx)                                                                             | Primitive / composition UI                                                                            |
| [components/ui/select.tsx](../../apps/web/src/components/ui/select.tsx)                                                                               | Primitive / composition UI                                                                            |
| [components/ui/separator.tsx](../../apps/web/src/components/ui/separator.tsx)                                                                         | Primitive / composition UI                                                                            |
| [components/ui/service-icon.tsx](../../apps/web/src/components/ui/service-icon.tsx)                                                                   | Primitive / composition UI                                                                            |
| [components/ui/sheet.tsx](../../apps/web/src/components/ui/sheet.tsx)                                                                                 | Primitive / composition UI                                                                            |
| [components/ui/sidebar.tsx](../../apps/web/src/components/ui/sidebar.tsx)                                                                             | `button`, `separator`, `sheet`, `skeleton`, `tooltip`                                                 |
| [components/ui/skeleton.tsx](../../apps/web/src/components/ui/skeleton.tsx)                                                                           | Primitive / composition UI                                                                            |
| [components/ui/sonner.tsx](../../apps/web/src/components/ui/sonner.tsx)                                                                               | Primitive / composition UI                                                                            |
| [components/ui/switch.tsx](../../apps/web/src/components/ui/switch.tsx)                                                                               | Primitive / composition UI                                                                            |
| [components/ui/table.tsx](../../apps/web/src/components/ui/table.tsx)                                                                                 | Primitive / composition UI                                                                            |
| [components/ui/tabs.tsx](../../apps/web/src/components/ui/tabs.tsx)                                                                                   | Primitive / composition UI                                                                            |
| [components/ui/textarea.tsx](../../apps/web/src/components/ui/textarea.tsx)                                                                           | Primitive / composition UI                                                                            |
| [components/ui/tooltip.tsx](../../apps/web/src/components/ui/tooltip.tsx)                                                                             | Primitive / composition UI                                                                            |
| [components/users/PermissionDecisionButton.tsx](../../apps/web/src/components/users/PermissionDecisionButton.tsx)                                     | `button`, `tooltip`                                                                                   |
| [components/users/PermissionStatePicker.tsx](../../apps/web/src/components/users/PermissionStatePicker.tsx)                                           | `button`, `tooltip`                                                                                   |
| [components/users/PermissionsEditor.tsx](../../apps/web/src/components/users/PermissionsEditor.tsx)                                                   | `badge`, `label`, `select`                                                                            |
| [components/users/RoleBoundPermissionStatus.tsx](../../apps/web/src/components/users/RoleBoundPermissionStatus.tsx)                                   | Composition / infrastructure                                                                          |
| [components/users/UserAvatar.tsx](../../apps/web/src/components/users/UserAvatar.tsx)                                                                 | `dicebear-avatar`                                                                                     |
| [components/users/UserDetailPage.tsx](../../apps/web/src/components/users/UserDetailPage.tsx)                                                         | `alert-dialog`, `badge`, `button`, `card`, `input`, `label`, `page-shell`, `skeleton`                 |
| components/users/UsersAdminHero.tsx — chemin historique : `apps/web/src/components/users/UsersAdminHero.tsx`                                                         | `badge`                                                                                               |
| [components/users/user-detail/AdminMfaResetDialog.tsx](../../apps/web/src/components/users/user-detail/AdminMfaResetDialog.tsx)                       | `button`, `dialog`, `input`, `label`, `service-icon`                                                  |
| [components/users/user-detail/AdminStepUpDialog.tsx](../../apps/web/src/components/users/user-detail/AdminStepUpDialog.tsx)                           | `button`, `dialog`, `input`, `label`, `service-icon`                                                  |
| [components/users/user-detail/UserAccessTab.tsx](../../apps/web/src/components/users/user-detail/UserAccessTab.tsx)                                   | `badge`, `button`, `card`, `input`, `label`, `select`                                                 |
| [components/users/user-detail/UserAccountTab.tsx](../../apps/web/src/components/users/user-detail/UserAccountTab.tsx)                                 | `badge`, `button`, `card`, `collapsible`, `switch`                                                    |
| [components/users/user-detail/UserDeletionCard.tsx](../../apps/web/src/components/users/user-detail/UserDeletionCard.tsx)                             | `button`, `card`                                                                                      |
| [components/users/user-detail/UserDetailLazySections.tsx](../../apps/web/src/components/users/user-detail/UserDetailLazySections.tsx)                 | Composition / infrastructure                                                                          |
| [components/users/user-detail/UserDetailNavigation.tsx](../../apps/web/src/components/users/user-detail/UserDetailNavigation.tsx)                     | Composition / infrastructure                                                                          |
| components/users/user-detail/UserDetailSectionRail.tsx — chemin historique : `apps/web/src/components/users/user-detail/UserDetailSectionRail.tsx`                   | `button`                                                                                              |
| [components/users/user-detail/UserHistoryTab.tsx](../../apps/web/src/components/users/user-detail/UserHistoryTab.tsx)                                 | `badge`, `button`, `card`, `collapsible`, `label`, `select`, `skeleton`                               |
| [components/users/user-detail/UserProfileTab.tsx](../../apps/web/src/components/users/user-detail/UserProfileTab.tsx)                                 | `alert-dialog`, `badge`, `button`, `card`, `input`, `label`                                           |
| [components/users/user-detail/UserSecurityTab.tsx](../../apps/web/src/components/users/user-detail/UserSecurityTab.tsx)                               | `alert-dialog`, `badge`, `button`, `card`, `label`, `service-icon`, `skeleton`, `switch`, `tooltip`   |
| [features/account/AccountPageContent.tsx](../../apps/web/src/features/account/AccountPageContent.tsx)                                                 | `alert-dialog`                                                                                        |
| [features/account/account-page.helpers.tsx](../../apps/web/src/features/account/account-page.helpers.tsx)                                             | `badge`, `skeleton`                                                                                   |
| [features/account/components/AccountPanel.tsx](../../apps/web/src/features/account/components/AccountPanel.tsx)                                       | Composition / infrastructure                                                                          |
| [features/account/components/ContactEmailDialog.tsx](../../apps/web/src/features/account/components/ContactEmailDialog.tsx)                           | `alert-dialog`, `button`, `dialog`, `input`, `label`, `service-icon`                                  |
| [features/account/components/ProfileSection.tsx](../../apps/web/src/features/account/components/ProfileSection.tsx)                                   | `button`, `input`, `label`                                                                            |
| [features/account/components/SecuritySection.tsx](../../apps/web/src/features/account/components/SecuritySection.tsx)                                 | `alert-dialog`, `badge`, `button`, `card`, `separator`, `service-icon`, `skeleton`                    |
| features/audit/SystemActivityJournalPage.tsx — chemin historique : `apps/web/src/features/audit/SystemActivityJournalPage.tsx`                                       | `badge`, `button`, `input`, `label`, `page-shell`, `select`, `skeleton`                               |
| [features/auth/components/MfaActionDialog.tsx](../../apps/web/src/features/auth/components/MfaActionDialog.tsx)                                       | `button`, `dialog`, `input`, `label`, `service-icon`                                                  |
| [features/auth/components/MfaCodeInput.tsx](../../apps/web/src/features/auth/components/MfaCodeInput.tsx)                                             | `input`, `label`                                                                                      |
| [features/auth/components/MfaRecoveryCodesPanel.tsx](../../apps/web/src/features/auth/components/MfaRecoveryCodesPanel.tsx)                           | `button`, `checkbox`, `label`                                                                         |
| [features/auth/components/MfaSetupDialog.tsx](../../apps/web/src/features/auth/components/MfaSetupDialog.tsx)                                         | `dialog`, `service-icon`                                                                              |
| [features/auth/components/MfaSetupFlow.tsx](../../apps/web/src/features/auth/components/MfaSetupFlow.tsx)                                             | `button`, `input`, `label`                                                                            |
| [features/dashboard/components/DashboardPageClient.tsx](../../apps/web/src/features/dashboard/components/DashboardPageClient.tsx)                     | `badge`, `button`, `card`, `page-shell`, `separator`, `service-icon`                                  |
| [features/internal-news/components/InternalNewsCard.tsx](../../apps/web/src/features/internal-news/components/InternalNewsCard.tsx)                   | `badge`, `button`, `card`, `service-icon`                                                             |
| [features/internal-news/components/InternalNewsFeed.tsx](../../apps/web/src/features/internal-news/components/InternalNewsFeed.tsx)                   | `badge`, `button`, `skeleton`                                                                         |
| [features/internal-news/components/InternalNewsPage.tsx](../../apps/web/src/features/internal-news/components/InternalNewsPage.tsx)                   | `badge`, `button`, `page-shell`, `skeleton`                                                           |
| [features/internal-news/components/PublishAnnouncementDialog.tsx](../../apps/web/src/features/internal-news/components/PublishAnnouncementDialog.tsx) | `button`, `dialog`, `input`, `label`, `switch`, `textarea`                                            |
| features/notifications/NotificationInboxPage.tsx — chemin historique : `apps/web/src/features/notifications/NotificationInboxPage.tsx`                               | `badge`, `button`, `card`, `page-shell`, `skeleton`                                                   |
| [features/persons/components/PersonAvatar.tsx](../../apps/web/src/features/persons/components/PersonAvatar.tsx)                                       | `dicebear-avatar`                                                                                     |
| [features/persons/components/PersonChildDialog.tsx](../../apps/web/src/features/persons/components/PersonChildDialog.tsx)                             | `button`, `dialog`                                                                                    |
| [features/persons/components/PersonCollectionFields.tsx](../../apps/web/src/features/persons/components/PersonCollectionFields.tsx)                   | `input`, `label`, `select`, `switch`                                                                  |
| [features/persons/components/PersonCollectionsSection.tsx](../../apps/web/src/features/persons/components/PersonCollectionsSection.tsx)               | `alert-dialog`, `badge`, `button`, `card`, `select`                                                   |
| [features/persons/components/PersonCreateForm.tsx](../../apps/web/src/features/persons/components/PersonCreateForm.tsx)                               | `button`, `card`, `service-icon`                                                                      |
| [features/persons/components/PersonDangerZone.tsx](../../apps/web/src/features/persons/components/PersonDangerZone.tsx)                               | Composition / infrastructure                                                                          |
| [features/persons/components/PersonDetailPage.tsx](../../apps/web/src/features/persons/components/PersonDetailPage.tsx)                               | `card`, `page-shell`, `skeleton`, `tabs`                                                              |
| [features/persons/components/PersonFieldProvenanceHint.tsx](../../apps/web/src/features/persons/components/PersonFieldProvenanceHint.tsx)             | `button`, `tooltip`                                                                                   |
| [features/persons/components/PersonIdentityFields.tsx](../../apps/web/src/features/persons/components/PersonIdentityFields.tsx)                       | `input`, `label`, `select`                                                                            |
| [features/persons/components/PersonIdentitySection.tsx](../../apps/web/src/features/persons/components/PersonIdentitySection.tsx)                     | `button`, `card`, `dialog`                                                                            |
| [features/persons/components/PersonSocialNetworkIcon.tsx](../../apps/web/src/features/persons/components/PersonSocialNetworkIcon.tsx)                 | Composition / infrastructure                                                                          |
| [features/persons/components/PersonStatusBadge.tsx](../../apps/web/src/features/persons/components/PersonStatusBadge.tsx)                             | `badge`                                                                                               |
| [features/persons/components/PersonsList.tsx](../../apps/web/src/features/persons/components/PersonsList.tsx)                                         | `button`, `data-table-section`, `input`, `select`, `skeleton`, `table`, `tooltip`                     |
| [features/persons/components/PersonsPageClient.tsx](../../apps/web/src/features/persons/components/PersonsPageClient.tsx)                             | `button`, `page-shell`, `skeleton`                                                                    |
| features/search/SearchPage.tsx — chemin historique : `apps/web/src/features/search/SearchPage.tsx`                                                                   | `badge`, `button`, `card`, `input`, `page-shell`, `select`                                            |
| [features/settings/SystemSettingsPage.tsx](../../apps/web/src/features/settings/SystemSettingsPage.tsx)                                               | `alert-dialog`, `badge`, `button`, `card`, `input`, `label`, `page-shell`, `service-icon`, `skeleton` |
| [features/users/UsersListPage.tsx](../../apps/web/src/features/users/UsersListPage.tsx)                                                               | `badge`, `button`, `data-table-section`, `input`, `select`, `skeleton`, `table`                       |
| [shared/context/FeatureAvailabilityContext.tsx](../../apps/web/src/shared/context/FeatureAvailabilityContext.tsx)                                     | Composition / infrastructure                                                                          |
| [shared/context/UserContext.tsx](../../apps/web/src/shared/context/UserContext.tsx)                                                                   | `alert`, `button`                                                                                     |
