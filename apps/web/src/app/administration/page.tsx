import { redirect } from 'next/navigation';

import { PAGE_PATHS } from '$constants/routes.constants';

export default function AdministrationRedirect(): never {
  redirect(PAGE_PATHS.users);
}
