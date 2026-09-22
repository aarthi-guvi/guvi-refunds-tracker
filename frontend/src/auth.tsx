import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import type { Role, User } from './types'

type AuthContextValue = { user: User | null; role: Role | null; login: (email: string, password: string) => Promise<void>; logout: () => void; loading: boolean }
const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const token = localStorage.getItem('guvi_refund_token')
  const me = useQuery({ queryKey: ['me'], queryFn: async () => (await api.get<User>('/auth/me')).data, enabled: !!token, retry: false })
  useEffect(() => { if (me.data) setUser(me.data); if (me.isError) { localStorage.removeItem('guvi_refund_token'); setUser(null) } }, [me.data, me.isError])
  const queryClient = useQueryClient()
  const login = async (email: string, password: string) => { const response = await api.post<{ token: string; user: User }>('/auth/login', { email, password }); localStorage.setItem('guvi_refund_token', response.data.token); setUser(response.data.user); await queryClient.invalidateQueries({ queryKey: ['me'] }) }
  const logout = () => { localStorage.removeItem('guvi_refund_token'); setUser(null); queryClient.clear() }
  return <AuthContext.Provider value={{ user, role: user?.role ?? null, login, logout, loading: !!token && me.isLoading }}>{children}</AuthContext.Provider>
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used within AuthProvider'); return value }
export function RequireAuth({ children, roles }: { children: ReactNode; roles?: Role[] }) { const { user, loading } = useAuth(); const navigate = useNavigate(); useEffect(() => { if (!loading && !user) navigate('/login', { replace: true }); else if (!loading && user && roles && !roles.includes(user.role)) navigate('/dashboard', { replace: true, state: { forbidden: true } }) }, [loading, user, roles, navigate]); return loading ? <div className="min-h-screen bg-paper" /> : user && (!roles || roles.includes(user.role)) ? <>{children}</> : null }
