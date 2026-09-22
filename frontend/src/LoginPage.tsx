import { useState } from 'react'
import { LockKeyhole, UserRound } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from './auth'

const demoAccounts = [
  { label: 'Admin', email: 'admin1@guvi.in', role: 'Full access', color: 'bg-coral' },
  { label: 'Finance', email: 'finance1@guvi.in', role: 'Approve & disburse', color: 'bg-blue' },
  { label: 'Coordinator', email: 'coordinator1@guvi.in', role: 'Review learner requests', color: 'bg-mint' },
  { label: 'BD', email: 'bd1@guvi.in', role: 'Own learner leads', color: 'bg-yellow' },
]

const messageFor = (error: unknown) => (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Unable to sign in. Check your details and try again.'

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const form = useForm({ defaultValues: { email: '', password: '' } })
  if (user) return <Navigate to="/dashboard" replace />

  const submit = async (values: { email: string; password: string }) => {
    try { setError(''); await login(values.email, values.password); navigate('/dashboard') } catch (reason) { setError(messageFor(reason)) }
  }
  const useDemo = (email: string) => { form.setValue('email', email); form.setValue('password', 'password123'); setError(''); void form.handleSubmit(submit)() }

  return <div className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]"><div className="hidden bg-navy p-12 text-white lg:flex lg:flex-col lg:justify-between"><div><span className="grid h-10 w-10 place-items-center rounded-xl bg-coral font-display text-xl font-bold">G</span><h1 className="mt-24 max-w-lg font-display text-6xl font-bold leading-[.98] tracking-tight">Refunds, with a little more clarity.</h1><p className="mt-7 max-w-sm text-base leading-7 text-white/55">A calm command center for every learner promise, decision, and rupee.</p></div><p className="text-xs text-white/35">GUVI operations · internal workspace</p></div><div className="flex items-center justify-center bg-paper p-6 sm:p-12"><div className="w-full max-w-md"><span className="font-display text-xl font-bold lg:hidden">GUVI <span className="font-normal text-ink/40">ops</span></span><div className="mb-8 mt-16 lg:mt-0"><p className="mb-2 text-[11px] font-bold uppercase tracking-[.18em] text-coral">Welcome back</p><h2 className="font-display text-4xl font-bold tracking-tight">Sign in to your desk</h2><p className="mt-3 text-sm text-ink/50">Choose a demo role or use your own work account.</p></div><div className="mb-7 grid grid-cols-2 gap-2">{demoAccounts.map(account => <button key={account.email} type="button" onClick={() => useDemo(account.email)} className="rounded-xl border border-ink/10 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-coral/40 hover:shadow-soft"><span className={`mb-2 grid h-7 w-7 place-items-center rounded-lg ${account.color} text-xs font-bold text-navy`}><UserRound size={14} /></span><span className="block text-sm font-bold">{account.label}</span><span className="mt-0.5 block text-[10px] leading-4 text-ink/45">{account.role}</span></button>)}</div><form onSubmit={form.handleSubmit(submit)} className="space-y-5"><label className="block text-sm font-semibold">Work email<input {...form.register('email', { required: true })} type="email" placeholder="you@guvi.in" className="field mt-2" /></label><label className="block text-sm font-semibold">Password<input {...form.register('password', { required: true })} type="password" placeholder="Enter your password" className="field mt-2" /></label>{error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-coral px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-coral/90 disabled:opacity-50" disabled={form.formState.isSubmitting}><LockKeyhole size={16} />{form.formState.isSubmitting ? 'Signing in...' : 'Continue'}</button></form><p className="mt-8 text-center text-xs text-ink/35">Demo accounts use the shared password `password123`.</p></div></div></div>
}
