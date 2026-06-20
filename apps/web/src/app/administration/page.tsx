import { redirect } from 'next/navigation';

export default function AdministrationRedirect(): never {
  redirect('/administration/utilisateurs');
}
