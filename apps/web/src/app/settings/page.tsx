import { redirect } from 'next/navigation';

export default function SettingsRedirect(): never {
  redirect('/mon-compte');
}
