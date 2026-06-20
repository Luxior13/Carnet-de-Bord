import { redirect } from 'next/navigation';

export default function UsersRedirect(): never {
  redirect('/administration/utilisateurs');
}
