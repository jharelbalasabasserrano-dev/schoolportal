import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { initialUsers, storageKeys, type User } from './portalData'

type AuthContextValue = {
  accounts: User[]
  user: User | null
  addAccount: (account: Omit<User, 'id'>) => void
  deleteAccount: (id: string) => void
  updateAccount: (id: string, updates: Omit<User, 'id' | 'password'>) => void
  login: (email: string, password: string, remember: boolean) => boolean
  logout: () => void
  changePassword: (currentPassword: string, nextPassword: string) => boolean
  updateProfile: (updates: Pick<User, 'name' | 'department' | 'avatarUrl'>) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function readStored<T>(key: string, fallback: T) {
  try {
    const value = localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : fallback
  } catch {
    return fallback
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<User[]>(() => {
    const stored = readStored<User[]>(storageKeys.accounts, [])
    const merged = [...initialUsers]
    stored.forEach((account) => {
      if (!merged.some((item) => item.email === account.email)) merged.push(account)
    })
    return merged
  })
  const [user, setUser] = useState<User | null>(() => {
    const savedEmail = localStorage.getItem(storageKeys.user)
    const storedAccounts = readStored<User[]>(storageKeys.accounts, initialUsers)
    return [...initialUsers, ...storedAccounts].find((account) => account.email === savedEmail) ?? null
  })

  useEffect(() => {
    localStorage.setItem(storageKeys.accounts, JSON.stringify(accounts))
  }, [accounts])

  const value = useMemo<AuthContextValue>(() => ({
    accounts,
    addAccount: (account) => {
      setAccounts((current) => [...current, { ...account, id: `${account.role}-${Date.now()}` }])
    },
    deleteAccount: (id) => {
      setAccounts((current) => current.filter((account) => account.id !== id || account.role === 'admin'))
    },
    updateAccount: (id, updates) => {
      setAccounts((current) => current.map((account) => account.id === id ? { ...account, ...updates } : account))
      setUser((current) => current?.id === id ? { ...current, ...updates } : current)
    },
    user,
    login: (email, password, remember) => {
      const match = accounts.find((account) => account.email === email.trim().toLowerCase() && account.password === password)
      if (!match) return false
      if (remember) localStorage.setItem(storageKeys.user, match.email)
      else localStorage.removeItem(storageKeys.user)
      setUser(match)
      return true
    },
    logout: () => {
      localStorage.removeItem(storageKeys.user)
      setUser(null)
    },
    changePassword: (currentPassword, nextPassword) => {
      if (!user || user.password !== currentPassword) return false
      const updated = { ...user, password: nextPassword }
      setAccounts((current) => current.map((account) => account.id === user.id ? updated : account))
      setUser(updated)
      return true
    },
    updateProfile: (updates) => {
      if (!user) return
      const updated = { ...user, ...updates }
      setAccounts((current) => current.map((account) => account.id === user.id ? updated : account))
      setUser(updated)
    },
  }), [accounts, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}