export const PUBLIC_PAGE_PATHS = new Set(['/login']);

export function isPublicPagePath(pathname: string): boolean {
  return PUBLIC_PAGE_PATHS.has(pathname);
}
