import { Link, NavLink } from 'react-router-dom'
import { useState } from 'react'
import { Bell, ChevronRight, CircleAlert, LayoutDashboard, LogOut, Menu, Plus, RefreshCw, Search, Settings, Users, WalletCards, X } from 'lucide-react'
import type { ReactNode } from 'react'
import type { RefundStatus, Role } from './types'
import { useAuth } from './auth'

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const links = [{ to: '/dashboard', label: 'Overview', icon: LayoutDashboard }, { to: '/refunds', label: 'Refund queue', icon: WalletCards }]
  
  return <div className="min-h-screen bg-paper text-ink">
    {/* Mobile Menu Overlay */}
    {mobileMenuOpen && (
      <div 
        className="fixed inset-0 z-50 bg-black/50 lg:hidden"
        onClick={() => setMobileMenuOpen(false)}
      >
        <div 
          className="fixed inset-y-0 left-0 w-64 bg-navy p-5 text-white"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-8 flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#FF6B00] font-display text-lg font-bold">G</span>
              <span className="font-display text-lg font-bold tracking-tight">GUVI <span className="font-normal text-white/50">ops</span></span>
            </Link>
            <button onClick={() => setMobileMenuOpen(false)} className="text-white/60 hover:text-white">
              <X size={24} />
            </button>
          </div>
          
          <nav className="space-y-2">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink 
                key={to} 
                to={to} 
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${isActive ? 'bg-white text-navy' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
            
            {user?.role === 'ADMIN' && (
              <>
                <p className="px-3 pb-1 pt-8 text-[10px] font-bold uppercase tracking-[.18em] text-white/35">Administration</p>
                <NavLink 
                  to="/admin/users" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/60 hover:bg-white/10"
                >
                  <Users size={18} />
                  Team access
                </NavLink>
                <NavLink 
                  to="/admin/business-calendar" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/60 hover:bg-white/10"
                >
                  <Settings size={18} />
                  Business calendar
                </NavLink>
              </>
            )}
          </nav>
          
          <div className="mt-auto rounded-2xl bg-white/10 p-4">
            <p className="text-xs text-white/45">Need a hand?</p>
            <p className="mt-1 text-sm text-white/80">Check the refund playbook before escalating.</p>
          </div>
        </div>
      </div>
    )}

    {/* Desktop Sidebar */}
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-ink/10 bg-navy px-5 py-7 text-white lg:flex">
      <Link to="/dashboard" className="mb-12 flex items-center gap-3 px-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#FF6B00] font-display text-lg font-bold">G</span>
        <span className="font-display text-lg font-bold tracking-tight">GUVI <span className="font-normal text-white/50">ops</span></span>
      </Link>
      
      <nav className="space-y-2">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink 
            key={to} 
            to={to} 
            className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${isActive ? 'bg-white text-navy' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
        
        {user?.role === 'ADMIN' && (
          <>
            <p className="px-3 pb-1 pt-8 text-[10px] font-bold uppercase tracking-[.18em] text-white/35">Administration</p>
            <NavLink to="/admin/users" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/60 hover:bg-white/10">
              <Users size={18} />
              Team access
            </NavLink>
            <NavLink to="/admin/business-calendar" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/60 hover:bg-white/10">
              <Settings size={18} />
              Business calendar
            </NavLink>
          </>
        )}
      </nav>
      
      <div className="mt-auto rounded-2xl bg-white/10 p-4">
        <p className="text-xs text-white/45">Need a hand?</p>
        <p className="mt-1 text-sm text-white/80">Check the refund playbook before escalating.</p>
      </div>
    </aside>

    {/* Main Content */}
    <div className="lg:pl-64">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-ink/10 bg-paper/90 px-4 backdrop-blur-md sm:px-6 lg:h-20 lg:px-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden rounded-lg p-2 text-ink/60 hover:bg-ink/5"
          >
            <Menu size={24} />
          </button>
          <div className="lg:hidden">
            <span className="font-display text-lg font-bold">GUVI <span className="font-normal text-ink/40">ops</span></span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden items-center gap-2 rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm text-ink/35 sm:flex">
            <Search size={16} />
            <span>Search...</span>
          </div>
          
          <button className="relative rounded-lg p-2 text-ink/60 hover:bg-ink/5">
            <Bell size={20} />
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#FF6B00]" />
          </button>
          
          <div className="flex items-center gap-3 rounded-xl border border-ink/10 bg-white px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-[#FF6B00]/10 text-[#FF6B00] flex items-center justify-center font-semibold text-sm">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium">{user?.name || 'User'}</p>
              <p className="text-xs text-ink/45">{user?.role || 'Role'}</p>
            </div>
            <button 
              onClick={logout}
              className="hidden rounded-lg p-2 text-ink/40 hover:bg-ink/5 sm:block"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>
      
      <main className="p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  </div>
}

export const StatusBadge = ({ status }: { status: RefundStatus }) => <span className={`status-${status.toLowerCase()}`}>{status.replace('_', ' ')}</span>
export function KpiCard({ label, value, hint, accent = 'guvi-success' }: { label: string; value: string; hint?: string; accent?: 'guvi-success' | 'guvi-orange' | 'guvi-yellow' | 'guvi-dark' }) { return <div className="panel relative overflow-hidden p-5"><div className={`absolute left-0 top-0 h-1 w-full bg-${accent}`} /><p className="text-xs font-semibold uppercase tracking-[.13em] text-ink/45">{label}</p><p className="mt-4 font-display text-3xl font-bold tracking-tight">{value}</p>{hint && <p className="mt-2 text-xs text-ink/45">{hint}</p>}</div> }
export function Skeleton({ className = '' }: { className?: string }) { return <div className={`animate-pulse rounded-lg bg-ink/10 ${className}`} /> }
export function PanelError({ message = 'This panel could not load.' }: { message?: string }) { return <div className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-coral/30 bg-[#FF6B00]/5 p-6 text-center"><CircleAlert className="text-[#FF6B00]" size={22} /><p className="text-sm text-ink/60">{message}</p></div> }
export function EmptyState({ clear }: { clear?: () => void }) { return <div className="flex flex-col items-center justify-center py-20 text-center"><div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-mint/40"><WalletCards size={25} /></div><h3 className="font-display text-lg font-bold">No refunds match these filters</h3><p className="mt-2 text-sm text-ink/50">Try widening the date range or clearing one of your filters.</p>{clear && <button onClick={clear} className="mt-5 text-sm font-semibold text-[#FF6B00] hover:underline">Clear filters</button>}</div> }
export function Button({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) { return <button className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF6B00] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#FF6B00]/90 disabled:cursor-not-allowed disabled:opacity-50 ${className}`} {...props}>{children}</button> }
export function PageHeading({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) { return <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-[11px] font-bold uppercase tracking-[.18em] text-[#FF6B00]">{eyebrow}</p><h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1></div>{action}</div> }
export function SlaCountdown({ dueAt }: { dueAt?: string }) { if (!dueAt) return <span className="text-xs text-ink/35">No SLA set</span>; const overdue = new Date(dueAt) < new Date(); return <span className={`text-xs font-semibold ${overdue ? 'text-[#FF6B00]' : 'text-ink/55'}`}>{overdue ? 'SLA breached' : `Due ${new Date(dueAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}</span> }
export function RoleGate({ allow, children }: { allow: Role[]; children: ReactNode }) { return allow.includes(useAuth().role as Role) ? <>{children}</> : null }
export { ChevronRight, Plus, RefreshCw }