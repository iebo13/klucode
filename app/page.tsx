import { redirect } from 'next/navigation';

// The signed-in home is the dashboard; middleware sends signed-out users to /login.
export default function Home() {
  redirect('/dashboard');
}
