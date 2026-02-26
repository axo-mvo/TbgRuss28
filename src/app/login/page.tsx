import LoginForm from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh p-4">
      <div className="w-full max-w-[400px] mb-6 text-center">
        <h1 className="text-2xl font-bold text-teal-primary">
          Russ 2028
        </h1>
      </div>
      <LoginForm />
    </div>
  )
}
