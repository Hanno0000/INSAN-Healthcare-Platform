import { redirect } from 'next/navigation';

// Root redirects to the Arabic admin
export default function RootPage() {
  redirect('/admin/dashboard');
}
