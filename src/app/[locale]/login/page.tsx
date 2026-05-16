import { LoginForm } from '@/components/LoginForm';

export default function LoginPage({ params }: { params: { locale: string } }) {
  return <LoginForm locale={params.locale as 'pt' | 'en'} />;
}
