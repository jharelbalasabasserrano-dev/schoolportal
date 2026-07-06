/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createAccount as createAccountInDatabase, deleteAccount as deleteAccountInDatabase, loadBootstrapData, updateAccount as updateAccountInDatabase } from './portalApi'
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

  useEffect(() => {
    let cancelled = false

    loadBootstrapData()
      .then((data) => {
        if (cancelled || data.accounts.length === 0) return
        setAccounts(data.accounts)
        localStorage.setItem(storageKeys.accounts, JSON.stringify(data.accounts))

        setUser((current) => {
          const savedEmail = current?.email ?? localStorage.getItem(storageKeys.user)
          return data.accounts.find((account) => account.email === savedEmail) ?? current
        })
      })
      .catch((error) => {
        console.warn(error)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    accounts,
    addAccount: (account) => {
      const next = { ...account, id: `${account.role}-${Date.now()}` }
      setAccounts((current) => [...current, next])
      createAccountInDatabase(next)
        .then((saved) => {
          setAccounts((current) => current.map((item) => item.id === next.id ? saved : item))
        })
        .catch((error) => {
          console.error('[admin users] User database create failed', { userId: next.id, email: next.email, error })
        })
    },
    deleteAccount: (id) => {
      setAccounts((current) => current.filter((account) => account.id !== id || account.role === 'admin'))
      deleteAccountInDatabase(id).catch((error) => {
        console.error('[admin users] User database delete failed', { userId: id, error })
      })
    },
    updateAccount: (id, updates) => {
      setAccounts((current) => current.map((account) => account.id === id ? { ...account, ...updates } : account))
      setUser((current) => current?.id === id ? { ...current, ...updates } : current)
      updateAccountInDatabase(id, updates).catch((error) => {
        console.error('[admin users] User database update failed', { userId: id, email: updates.email, error })
      })
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
