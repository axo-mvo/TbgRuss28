import Link from 'next/link'
import RegisterForm from '@/components/auth/RegisterForm'

export default function RegisterPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh p-4">
      <div className="w-full max-w-[400px] mb-6 text-center">
        <h1 className="text-2xl font-bold text-teal-primary mb-1">
          Buss 2028 Fellesmote
        </h1>
        <h2 className="text-lg text-text-muted">Registrer deg</h2>
      </div>
      <RegisterForm />
      <p className="mt-4 text-sm text-text-muted">
        Har du allerede konto?{' '}
        <Link
          href="/login"
          className="text-teal-primary font-medium hover:underline"
        >
          Logg inn
        </Link>
      </p>
    </div>
  )
}
