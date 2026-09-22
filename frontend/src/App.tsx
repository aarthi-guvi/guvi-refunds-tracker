import { useMemo, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowLeft, ArrowUpRight, CalendarDays, Check, ChevronDown, Download, FileText, Filter, LockKeyhole, Plus, RefreshCw, Save, Upload, X } from 'lucide-react'
import { api } from './api'
import { useAuth, RequireAuth } from './auth'
import type { Eligibility, Refund, RefundStatus, Role, Summary, TrendPoint } from './types'
import { AppShell, Button, EmptyState, KpiCard, PageHeading, PanelError, RoleGate, SlaCountdown, Skeleton, StatusBadge } from './components'
import Login from './LoginPage'

const money = (value: number | string | undefined) => `₹${(Number(value || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
const errorText = (error: unknown) => (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Something went wrong. Please try again.'

function LegacyLogin() { const { user, login } = useAuth(); const navigate = useNavigate(); const [error, setError] = useState(''); const form = useForm({ defaultValues: { email: '', password: '' } }); if (user) return <Navigate to="/dashboard" replace />; return <div className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]"><div className="hidden bg-navy p-12 text-white lg:flex lg:flex-col lg:justify-between"><div><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#FF6B00] font-display text-xl font-bold">G</span><h1 className="mt-24 max-w-lg font-display text-6xl font-bold leading-[.98] tracking-tight">Refunds, with a little more clarity.</h1><p className="mt-7 max-w-sm text-base leading-7 text-white/55">A calm command center for every learner promise, decision, and rupee.</p></div><p className="text-xs text-white/35">GUVI operations · internal workspace</p></div><div className="flex items-center justify-center bg-paper p-6 sm:p-12"><div className="w-full max-w-md"><span className="font-display text-xl font-bold lg:hidden">GUVI <span className="font-normal text-ink/40">ops</span></span><div className="mb-10 mt-16 lg:mt-0"><p className="mb-2 text-[11px] font-bold uppercase tracking-[.18em] text-guvi-orange">Welcome back</p><h2 className="font-display text-4xl font-bold tracking-tight">Sign in to your desk</h2><p className="mt-3 text-sm text-ink/50">Keep learner resolutions moving.</p></div><form onSubmit={form.handleSubmit(async values => { try { setError(''); await login(values.email, values.password); navigate('/dashboard') } catch (e) { setError(errorText(e)) } })} className="space-y-5"><label className="block text-sm font-semibold">Work email<input {...form.register('email', { required: true })} type="email" placeholder="you@guvi.in" className="field mt-2" /></label><label className="block text-sm font-semibold">Password<input {...form.register('password', { required: true })} type="password" placeholder="Enter your password" className="field mt-2" /></label>{error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<Button type="submit" className="mt-3 w-full" disabled={form.formState.isSubmitting}> <LockKeyhole size={16} /> {form.formState.isSubmitting ? 'Signing in...' : 'Continue'} </Button></form><p className="mt-8 text-center text-xs text-ink/35">JWT is stored in localStorage until httpOnly cookie auth is available.</p></div></div></div> }

function Dashboard() { const [range, setRange] = useState('this-month'); const summary = useQuery({ queryKey: ['dashboard-summary', range], queryFn: async () => (await api.get<Summary>('/dashboard/summary', { params: { range } })).data }); const trends = useQuery({ queryKey: ['dashboard-trends', range], queryFn: async () => (await api.get<{ byReason?: TrendPoint[]; weekly?: TrendPoint[]; sla?: TrendPoint[] }>('/dashboard/trends', { params: { range } })).data }); const byBd = useQuery({ queryKey: ['dashboard-by-bd', range], queryFn: async () => (await api.get<TrendPoint[]>('/dashboard/by-bd', { params: { range } })).data }); const data = trends.data; return <><PageHeading eyebrow="Tuesday, 22 September 2026" title="Refund control room" action={<div className="flex items-center gap-2"><CalendarDays size={16} className="text-ink/40" /><select value={range} onChange={e => setRange(e.target.value)} className="field w-auto"><option value="this-month">This month</option><option value="last-month">Last month</option><option value="quarter">Last 90 days</option></select></div>} /><div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{summary.isLoading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-36" />) : summary.isError ? <PanelError message="Summary unavailable" /> : <><KpiCard label="Refund value" value={money(summary.data?.totalRefunds)} hint={`${summary.data?.totalCount ?? 0} requests logged`} /><KpiCard label="Avg resolution" value={`${Number(summary.data?.avgResolutionDays || 0).toFixed(1)}d`} hint="Working days" accent="guvi-dark" /><KpiCard label="SLA breached" value={`${Number(summary.data?.slaBreachPct || 0).toFixed(1)}%`} hint="Across active queue" accent="guvi-orange" /><KpiCard label="Pending review" value={String(summary.data?.pendingCount ?? '—')} hint="Awaiting an owner" accent="guvi-yellow" /><KpiCard label="Fees withheld" value={summary.data?.totalWithheld ? money(summary.data.totalWithheld) : '—'} hint="GST + processing" /></>}</div><div className="grid gap-5 lg:grid-cols-2"><ChartPanel title="Refunds by reason" subtitle="Where requests are coming from" query={trends} data={data?.byReason ?? []} type="reason" /><ChartPanel title="Weekly volume" subtitle="Requests logged by week" query={trends} data={data?.weekly ?? []} type="line" /><ChartPanel title="SLA compliance" subtitle="Share resolved within SLA" query={trends} data={data?.sla ?? []} type="sla" /><ChartPanel title="Refunds by owner" subtitle="Coordinator and BD workload" query={byBd} data={Array.isArray(byBd.data) ? byBd.data : []} type="bars" /></div></> }
function ChartPanel({ title, subtitle, query, data, type }: { title: string; subtitle: string; query: { isLoading: boolean; isError: boolean }; data: TrendPoint[]; type: string }) { return <section className="panel min-h-[380px] p-5"><div className="mb-5 flex items-start justify-between"><div><h2 className="font-display text-lg font-bold">{title}</h2><p className="mt-1 text-xs text-ink/45">{subtitle}</p></div><button className="rounded-lg p-1.5 text-ink/35 hover:bg-paper"><ArrowUpRight size={17} /></button></div>{query.isLoading ? <Skeleton className="h-56 w-full" /> : query.isError ? <PanelError message="This chart endpoint is not available yet." /> : data.length === 0 ? <PanelError message="No trend data for this range." /> : <ResponsiveContainer width="100%" height={280}>{type === 'reason' ? <PieChart><Pie data={data} dataKey="value" nameKey="label" innerRadius={54} outerRadius={83} paddingAngle={4}>{data.map((_, i) => <Cell key={i} fill={['#FF6B00', '#0D47A1', '#00C853', '#FFC107'][i % 4]} />)}</Pie><Tooltip formatter={(v) => [v, 'Refunds']} /><Legend verticalAlign="bottom" height={60} iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} /></PieChart> : type === 'bars' ? <BarChart data={data}><CartesianGrid vertical={false} stroke="#18202b14" /><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} /><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" fill="#FF6B00" radius={[5, 5, 0, 0]} /></BarChart> : <AreaChart data={data}><defs><linearGradient id={`fill-${type}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00C853" stopOpacity={.8} /><stop offset="95%" stopColor="#00C853" stopOpacity={.05} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#18202b14" /><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} /><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} /><Tooltip /><Area type="monotone" dataKey="value" stroke="#0D47A1" fill={`url(#fill-${type})`} strokeWidth={2} /></AreaChart>}</ResponsiveContainer>}</section> }

function Refunds() { const [params, setParams] = useSearchParams(); const navigate = useNavigate(); const status = params.get('status') || ''; const query = useQuery({ queryKey: ['refunds', params.toString()], queryFn: async () => (await api.get<{ refunds: Refund[]; total: number }>('/refunds', { params: Object.fromEntries(params) })).data }); const clear = () => setParams({}); return <><PageHeading eyebrow="Operations queue" title="Refund requests" action={<RoleGate allow={['ADMIN', 'COORDINATOR']}><Link to="/refunds/new" className="inline-flex items-center gap-2 rounded-xl bg-[#FF6B00] px-4 py-2.5 text-sm font-bold text-white"><Plus size={17} />New refund</Link></RoleGate>} /><div className="panel mb-5 p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-center"><div className="flex flex-1 items-center gap-2 rounded-xl border border-ink/10 bg-paper px-3"><Filter size={16} className="text-ink/40" /><select value={status} onChange={e => { const next = new URLSearchParams(params); e.target.value ? next.set('status', e.target.value) : next.delete('status'); setParams(next) }} className="w-full bg-transparent py-2.5 text-sm outline-none"><option value="">All statuses</option>{['LOGGED', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING', 'DISBURSED', 'REJECTED', 'ON_HOLD'].map(s => <option key={s}>{s}</option>)}</select></div><input className="field lg:max-w-xs" placeholder="Search learner or ID" value={params.get('search') || ''} onChange={e => { const next = new URLSearchParams(params); e.target.value ? next.set('search', e.target.value) : next.delete('search'); setParams(next) }} /><button onClick={() => window.alert('CSV export is pending a server-side export endpoint.')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-sm font-bold"><Download size={16} />Export CSV</button></div></div><div className="panel overflow-hidden">{query.isLoading ? <div className="space-y-3 p-6">{Array.from({ length: 5 }).map((_, i) => <Skeleton className="h-12" key={i} />)}</div> : query.isError ? <PanelError message="Refund list endpoint is not available yet." /> : query.data?.refunds?.length ? <><div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead className="border-b border-ink/10 bg-paper text-[10px] uppercase tracking-[.14em] text-ink/45"><tr><th className="px-6 py-4">Request</th><th className="px-4 py-4">Learner</th><th className="px-4 py-4">Reason</th><th className="px-4 py-4">Amount</th><th className="px-4 py-4">SLA</th><th className="px-4 py-4">Status</th></tr></thead><tbody>{query.data.refunds.map(refund => <tr key={refund.id} onClick={() => navigate(`/refunds/${refund.id}`)} className="cursor-pointer border-b border-ink/5 transition last:border-0 hover:bg-paper"><td className="px-6 py-5 font-semibold">RF-{String(refund.id).padStart(4, '0')}<p className="mt-1 text-xs font-normal text-ink/40">{new Date(refund.loggedAt).toLocaleDateString()}</p></td><td className="px-4 py-5">{refund.learner?.name ?? '—'}<p className="mt-1 text-xs text-ink/40">{refund.learner?.courseEnrolled ?? '—'}</p></td><td className="px-4 py-5 text-ink/65">{refund.refundReason.replaceAll('_', ' ')}</td><td className="px-4 py-5 font-semibold">{money(refund.requestedAmount)}</td><td className="px-4 py-5"><SlaCountdown dueAt={refund.slaDueAt} /></td><td className="px-4 py-5"><StatusBadge status={refund.status} /></td></tr>)}</tbody></table></div><div className="space-y-3 p-4 md:hidden">{query.data.refunds.map(refund => <button key={refund.id} onClick={() => navigate(`/refunds/${refund.id}`)} className="w-full rounded-xl border border-ink/10 p-4 text-left"><div className="flex justify-between"><span className="font-semibold">RF-{String(refund.id).padStart(4, '0')}</span><StatusBadge status={refund.status} /></div><p className="mt-3 font-semibold">{refund.learner?.name ?? 'Unknown learner'}</p><div className="mt-2 flex justify-between text-xs text-ink/45"><span>{refund.refundReason.replaceAll('_', ' ')}</span><span className="font-bold text-ink">{money(refund.requestedAmount)}</span></div></button>)}</div><div className="flex items-center justify-between border-t border-ink/10 px-6 py-4 text-xs text-ink/45"><span>{query.data.total} total requests</span><button className="font-semibold text-guvi-orange">Next page <ChevronDown className="inline rotate-[-90deg]" size={14} /></button></div></> : <EmptyState clear={clear} />}</div></> }

function EligibilityBreakdown({ eligibility, loading }: { eligibility?: Eligibility; loading?: boolean }) { return <div className="rounded-2xl bg-navy p-5 text-white">{loading ? <><Skeleton className="h-5 w-40 bg-white/20" /><Skeleton className="mt-6 h-9 w-52 bg-white/20" /></> : eligibility ? <><div className="flex items-start justify-between"><div><p className="text-xs uppercase tracking-[.14em] text-white/50">Estimated eligible amount</p><p className="mt-2 font-display text-4xl font-bold">{money(eligibility.eligibleAmount)}</p></div><span className="rounded-full bg-mint px-2.5 py-1 text-[10px] font-bold uppercase text-navy">{eligibility.refundRoute.replaceAll('_', ' ')}</span></div><div className="mt-7 border-t border-white/10 pt-4"><p className="mb-3 text-xs font-semibold uppercase tracking-[.14em] text-white/45">Deductions</p>{eligibility.deductions.length ? eligibility.deductions.map(d => <div key={d.type} className="flex justify-between py-2 text-sm text-white/70"><span>{d.type.replaceAll('_', ' ')}</span><span>- {money(d.amount)}</span></div>) : <p className="text-sm text-white/55">No deductions applied.</p>}</div></> : <div className="py-5"><p className="font-display text-lg font-bold">Eligibility preview</p><p className="mt-2 text-sm text-white/55">Select a learner and payment to see the rule engine's receipt.</p></div>}</div> }

function NewRefund() { const navigate = useNavigate(); const [eligibility, setEligibility] = useState<Eligibility>(); const [eligibilityLoading, setEligibilityLoading] = useState(false); const form = useForm({ resolver: zodResolver(z.object({ learnerId: z.string().min(1), paymentId: z.string().min(1), refundReason: z.string().min(1), otherReasonDetail: z.string().optional(), requestedAmount: z.string().min(1) })), defaultValues: { learnerId: '', paymentId: '', refundReason: '', otherReasonDetail: '', requestedAmount: '' } }); const reason = form.watch('refundReason'); const submit = useMutation({ mutationFn: async (values: Record<string, string>) => (await api.post<Refund>('/refunds', { ...values, learnerId: Number(values.learnerId), paymentId: Number(values.paymentId), requestedAmount: Number(values.requestedAmount) })).data, onSuccess: refund => navigate(`/refunds/${refund.id}`) }); const preview = async () => { if (!form.getValues('learnerId') || !form.getValues('paymentId') || !reason) return; setEligibilityLoading(true); try { const result = await api.get<Eligibility>(`/refunds/${form.getValues('paymentId')}/eligibility`); setEligibility(result.data) } catch { setEligibility(undefined) } finally { setEligibilityLoading(false) } }; return <><PageHeading eyebrow="New request" title="Log a refund" action={<Link to="/refunds" className="inline-flex items-center gap-2 text-sm font-bold text-ink/55"><ArrowLeft size={16} />Back to queue</Link>} /><form onSubmit={form.handleSubmit(v => submit.mutate(v))} className="grid gap-6 lg:grid-cols-[1fr_390px]"><div className="panel p-6"><div className="mb-7 flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#FF6B00] text-sm font-bold text-white">1</span><div><h2 className="font-display text-lg font-bold">Request details</h2><p className="text-xs text-ink/45">Connect the learner, payment, and reason.</p></div></div><div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-semibold">Learner ID<input {...form.register('learnerId')} className="field mt-2" placeholder="Search learner ID" /></label><label className="block text-sm font-semibold">Payment ID<input {...form.register('paymentId')} className="field mt-2" placeholder="Select payment" /></label><label className="block text-sm font-semibold">Reason<select {...form.register('refundReason')} className="field mt-2"><option value="">Select a reason</option>{['COURSE_QUALITY', 'DUPLICATE_PAYMENT', 'TECHNICAL_ISSUE', 'CHANGE_OF_MIND', 'JOB_ASSURANCE_BREACH', 'WRONG_COURSE_ENROLLED', 'OTHER'].map(r => <option key={r}>{r}</option>)}</select></label><label className="block text-sm font-semibold">Requested amount<input {...form.register('requestedAmount')} className="field mt-2" placeholder="Amount in paise" inputMode="numeric" /></label></div>{reason === 'OTHER' && <label className="mt-5 block text-sm font-semibold">Tell us more<textarea {...form.register('otherReasonDetail')} className="field mt-2 min-h-24" placeholder="Add context for review" /></label>}<div className="mt-8 flex flex-wrap justify-end gap-3"><button type="button" onClick={preview} className="inline-flex items-center gap-2 rounded-xl border border-ink/10 bg-paper px-4 py-2.5 text-sm font-bold"><RefreshCw size={16} />Preview eligibility</button><Button type="submit" disabled={submit.isPending}><Save size={16} />{submit.isPending ? 'Creating...' : 'Create request'}</Button></div>{submit.isError && <p className="mt-4 text-right text-sm text-red-600">{errorText(submit.error)}</p>}</div><EligibilityBreakdown eligibility={eligibility} loading={eligibilityLoading} /></form></> }

function RefundDetail() { const id = useLocation().pathname.split('/').pop(); const { role } = useAuth(); const queryClient = useQueryClient(); const detail = useQuery({ queryKey: ['refund', id], queryFn: async () => (await api.get<Refund & { auditLogs?: unknown[] }>(`/refunds/${id}`)).data }); const transition = useMutation({ mutationFn: async (toStatus: RefundStatus) => (await api.patch(`/refunds/${id}/status`, { toStatus })).data, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['refund', id] }) }); if (detail.isLoading) return <><Skeleton className="h-10 w-72" /><Skeleton className="mt-8 h-96" /></>; if (detail.isError) return <PanelError message="Refund detail endpoint is not available yet." />; const refund = detail.data!; const next = role === 'COORDINATOR' && refund.status === 'LOGGED' ? 'UNDER_REVIEW' : role === 'FINANCE' && refund.status === 'UNDER_REVIEW' ? 'APPROVED' : role === 'FINANCE' && refund.status === 'APPROVED' ? 'PROCESSING' : role === 'FINANCE' && refund.status === 'PROCESSING' ? 'DISBURSED' : null; return <><PageHeading eyebrow={`RF-${String(refund.id).padStart(4, '0')}`} title={refund.learner?.name ?? 'Refund request'} action={<Link to="/refunds" className="inline-flex items-center gap-2 text-sm font-bold text-ink/55"><ArrowLeft size={16} />Back to queue</Link>} /><div className="sticky bottom-3 z-10 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-white/95 p-3 shadow-soft backdrop-blur"><div className="flex items-center gap-3"><StatusBadge status={refund.status} /><SlaCountdown dueAt={refund.slaDueAt} /></div><div className="flex gap-2">{next && <Button disabled={transition.isPending} onClick={() => transition.mutate(next)}>{transition.isPending ? 'Updating...' : `Move to ${next.replace('_', ' ')}`}</Button>}{(role === 'FINANCE' || role === 'ADMIN') && refund.status === 'UNDER_REVIEW' && <button onClick={() => transition.mutate('REJECTED')} className="rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-600">Reject</button>}</div></div><div className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]"><div className="space-y-5"><section className="panel p-6"><div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold">Request overview</h2><FileText className="text-ink/25" size={20} /></div><div className="mt-6 grid gap-5 sm:grid-cols-3"><div><p className="label">Course</p><p className="value">{refund.learner?.courseEnrolled ?? '—'}</p></div><div><p className="label">Reason</p><p className="value">{refund.refundReason.replaceAll('_', ' ')}</p></div><div><p className="label">Requested</p><p className="value">{money(refund.requestedAmount)}</p></div></div></section><section className="panel p-6"><h2 className="font-display text-lg font-bold">Status timeline</h2><div className="mt-7 flex items-start justify-between">{['LOGGED', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING', 'DISBURSED'].map((stage, i) => { const states = ['LOGGED', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING', 'DISBURSED']; const active = states.indexOf(refund.status) >= i; return <div key={stage} className="relative flex flex-1 flex-col items-center text-center"><div className={`z-10 grid h-8 w-8 place-items-center rounded-full border-4 border-white text-xs font-bold ${active ? 'bg-[#FF6B00] text-white' : 'bg-ink/10 text-ink/35'}`}>{active ? <Check size={14} /> : i + 1}</div>{i < 4 && <div className={`absolute left-1/2 top-4 h-0.5 w-full ${active && states.indexOf(refund.status) > i ? 'bg-[#FF6B00]' : 'bg-ink/10'}`} />}<p className={`mt-3 text-[10px] font-bold uppercase tracking-wide ${active ? 'text-ink' : 'text-ink/35'}`}>{stage.replace('_', ' ')}</p></div>})}</div></section><section className="panel p-6"><div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold">Audit log</h2><ChevronDown size={18} className="text-ink/40" /></div><p className="mt-4 text-sm text-ink/45">Audit history is loaded from the server with the refund detail.</p></section></div><div><section className="panel p-6"><p className="label">Payment information</p><p className="mt-3 font-display text-2xl font-bold">{money(refund.payment?.amount)}</p><p className="mt-1 text-sm text-ink/50">{refund.payment?.paymentMode?.replace('_', ' ') ?? '—'}</p><div className="mt-5 border-t border-ink/10 pt-4 text-sm"><div className="flex justify-between py-2"><span className="text-ink/45">Learner</span><span>{refund.learner?.email ?? '—'}</span></div><div className="flex justify-between py-2"><span className="text-ink/45">Logged</span><span>{new Date(refund.loggedAt).toLocaleDateString()}</span></div></div></section><section className="mt-5 panel p-6"><div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold">Attachments</h2><button className="rounded-lg p-2 text-guvi-orange hover:bg-paper"><Upload size={17} /></button></div><p className="mt-5 text-sm text-ink/45">Drop files here or use upload. R2 attachment endpoint pending.</p></section></div></div></> }

function AdminPage({ title }: { title: string }) { return <><PageHeading eyebrow="Administration" title={title} /><PanelError message="This admin endpoint is not available in the current backend yet." /></> }

function UsersAdmin() {
  const queryClient = useQueryClient();
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => (await api.get('/admin/users')).data
  });

  const createUser = useMutation({
    mutationFn: async (values: any) => (await api.post('/admin/users', values)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] })
  });

  const deleteUser = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/admin/users/${id}`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] })
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const form = useForm({
    defaultValues: { email: '', password: '', name: '', role: 'COORDINATOR' as Role }
  });

  return <>
    <PageHeading 
      eyebrow="Administration" 
      title="Team access" 
      action={<Button onClick={() => setShowCreateModal(true)}><Plus size={16} />Add user</Button>}
    />
    <div className="panel">
      {isLoading ? <Skeleton className="h-64" /> : error ? <PanelError message="Failed to load users" /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink/10 text-left text-sm font-semibold text-ink/45">
                <th className="pb-3 pl-4">Name</th>
                <th className="pb-3">Email</th>
                <th className="pb-3">Role</th>
                <th className="pb-3">Created</th>
                <th className="pb-3 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((user: any) => (
                <tr key={user.id} className="border-b border-ink/5 text-sm">
                  <td className="py-3 pl-4 font-medium">{user.name}</td>
                  <td className="py-3 text-ink/60">{user.email}</td>
                  <td className="py-3"><span className="rounded-full bg-ink/5 px-2 py-1 text-xs font-semibold">{user.role}</span></td>
                  <td className="py-3 text-ink/45">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</td>
                  <td className="py-3 pr-4 text-right">
                    <button 
                      onClick={() => deleteUser.mutate(user.id)}
                      className="text-guvi-orange hover:underline text-xs font-semibold"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
    
    {showCreateModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="panel w-full max-w-md p-6">
          <h2 className="font-display text-xl font-bold mb-4">Add new user</h2>
          <form onSubmit={form.handleSubmit(v => createUser.mutate(v, { onSuccess: () => setShowCreateModal(false) }))} className="space-y-4">
            <label className="block">
              <span className="text-sm font-semibold">Name</span>
              <input {...form.register('name', { required: true })} className="field mt-1" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Email</span>
              <input {...form.register('email', { required: true })} type="email" className="field mt-1" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Password</span>
              <input {...form.register('password', { required: true })} type="password" className="field mt-1" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Role</span>
              <select {...form.register('role', { required: true })} className="field mt-1">
                <option value="ADMIN">Admin</option>
                <option value="FINANCE">Finance</option>
                <option value="COORDINATOR">Coordinator</option>
                <option value="BD">BD</option>
              </select>
            </label>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={createUser.isPending}>
                {createUser.isPending ? 'Creating...' : 'Create user'}
              </Button>
              <button 
                type="button" 
                onClick={() => setShowCreateModal(false)}
                className="rounded-xl border border-ink/10 px-4 py-2.5 text-sm font-bold hover:bg-ink/5"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </>;
}

function BusinessCalendarAdmin() {
  const queryClient = useQueryClient();
  const { data: calendar, isLoading, error } = useQuery({
    queryKey: ['admin-calendar'],
    queryFn: async () => (await api.get('/admin/business-calendar')).data
  });

  const updateEntry = useMutation({
    mutationFn: async ({ date, isHoliday }: { date: string; isHoliday: boolean }) =>
      (await api.put('/admin/business-calendar', { date, isHoliday })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-calendar'] })
  });

  const [newDate, setNewDate] = useState('');
  const [isHoliday, setIsHoliday] = useState(false);

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDate) {
      updateEntry.mutate({ date: newDate, isHoliday }, {
        onSuccess: () => setNewDate('')
      });
    }
  };

  return <>
    <PageHeading eyebrow="Administration" title="Business calendar" />
    <div className="panel mb-5 p-4">
      <form onSubmit={handleAddEntry} className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm font-semibold">Date</label>
          <input 
            type="date" 
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="field mt-1"
          />
        </div>
        <div className="flex items-center gap-2 pt-5">
          <input 
            type="checkbox" 
            id="holiday"
            checked={isHoliday}
            onChange={(e) => setIsHoliday(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="holiday" className="text-sm font-semibold">Mark as holiday</label>
        </div>
        <Button type="submit" disabled={updateEntry.isPending || !newDate} className="mt-4">
          {updateEntry.isPending ? 'Adding...' : 'Add entry'}
        </Button>
      </form>
    </div>
    
    <div className="panel">
      {isLoading ? <Skeleton className="h-64" /> : error ? <PanelError message="Failed to load calendar" /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink/10 text-left text-sm font-semibold text-ink/45">
                <th className="pb-3 pl-4">Date</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {calendar?.map((entry: any) => (
                <tr key={entry.id} className="border-b border-ink/5 text-sm">
                  <td className="py-3 pl-4 font-medium">{new Date(entry.date).toLocaleDateString()}</td>
                  <td className="py-3">
                    {entry.isHoliday ? (
                      <span className="rounded-full bg-[#FF6B00]/10 text-guvi-orange px-2 py-1 text-xs font-semibold">Holiday</span>
                    ) : (
                      <span className="rounded-full bg-mint/10 text-mint px-2 py-1 text-xs font-semibold">Working day</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <button 
                      onClick={() => updateEntry.mutate({ 
                        date: entry.date.toISOString().split('T')[0], 
                        isHoliday: !entry.isHoliday 
                      })}
                      className="text-guvi-orange hover:underline text-xs font-semibold"
                    >
                      Toggle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </>;
}
function App() { const location = useLocation(); return <Routes><Route path="/login" element={<Login />} /><Route path="*" element={<RequireAuth><AppShell><Routes><Route path="/" element={<Navigate to="/dashboard" replace />} /><Route path="/dashboard" element={<Dashboard />} /><Route path="/refunds" element={<Refunds />} /><Route path="/refunds/new" element={<RoleGate allow={['ADMIN', 'COORDINATOR']}><NewRefund /></RoleGate>} /><Route path="/refunds/:id" element={<RefundDetail />} /><Route path="/admin/users" element={<AdminRoute><UsersAdmin /></AdminRoute>} /><Route path="/admin/business-calendar" element={<AdminRoute><BusinessCalendarAdmin /></AdminRoute>} /><Route path="*" element={<Navigate to="/dashboard" replace />} /></Routes></AppShell></RequireAuth>} /></Routes> }
function AdminRoute({ children }: { children: React.ReactNode }) { return <RequireAuth roles={['ADMIN']}>{children}</RequireAuth> }
export default App
