/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authenticateAccount, changeAccountPassword, createAccount as createAccountInDatabase, deleteAccount as deleteAccountInDatabase, loadBootstrapData, refreshBootstrapData, updateAccount as updateAccountInDatabase } from './portalApi'
import { storageKeys, type User } from './portalData'

type AuthContextValue = {
  accounts: User[]
  user: User | null
  addAccount: (account: Omit<User, 'id'>) => Promise<User>
  deleteAccount: (id: string) => Promise<void>
  updateAccount: (id: string, updates: Omit<User, 'id' | 'password'>) => Promise<User>
  login: (email: string, password: string, remember: boolean) => Promise<{ ok: boolean; message?: string }>
  logout: () => void
  changePassword: (currentPassword: string, nextPassword: string) => Promise<{ ok: boolean; message?: string }>
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
  const [accounts, setAccounts] = useState<User[]>([])
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    let cancelled = false

    loadBootstrapData()
      .then((data) => {
        if (cancelled) return
        setAccounts(data.accounts)

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
    addAccount: async (account) => {
      const next = { ...account, id: `${account.role}-${Date.now()}`, password: '' }
      const createPayload = { ...next, password: account.password }
      const saved = await createAccountInDatabase(createPayload)
      const data = await refreshBootstrapData()
      setAccounts(data.accounts)
      return data.accounts.find((item) => item.id === saved.id) ?? saved
    },
    deleteAccount: async (id) => {
      await deleteAccountInDatabase(id)
      const data = await refreshBootstrapData()
      setAccounts(data.accounts)
      setUser((current) => current?.id === id ? null : current)
    },
    updateAccount: async (id, updates) => {
      const saved = await updateAccountInDatabase(id, updates)
      const data = await refreshBootstrapData()
      setAccounts(data.accounts)
      const refreshed = data.accounts.find((account) => account.id === id) ?? saved
      setUser((current) => current?.id === id ? refreshed : current)
      return refreshed
    },
    user,
    login: async (email, password, remember) => {
      const normalizedEmail = email.trim().toLowerCase()
      try {
        const authenticated = await authenticateAccount(normalizedEmail, password)
        const updated = { ...authenticated, password: '' }
        setAccounts((current) => current.map((account) => account.id === updated.id ? updated : account))
        if (remember) localStorage.setItem(storageKeys.user, updated.email)
        else localStorage.removeItem(storageKeys.user)
        setUser(updated)
        return { ok: true }
      } catch (error) {
        console.warn(error)
        const message = error instanceof Error ? error.message : ''
        return { ok: false, message: message || 'Invalid email or password' }
      }
    },
    logout: () => {
      localStorage.removeItem(storageKeys.user)
      setUser(null)
    },
    changePassword: async (currentPassword, nextPassword) => {
      if (!user) return { ok: false, message: 'You must be signed in to change your password.' }
      try {
        const currentUser = await authenticateAccount(user.email, currentPassword)
        const savedUser = await changeAccountPassword(currentUser.id, currentPassword, nextPassword)
        const verifiedUser = await authenticateAccount(savedUser.email, nextPassword)
        const updated = { ...verifiedUser, password: '' }
        setAccounts((current) => current.map((account) => account.id === user.id || account.id === currentUser.id ? updated : account))
        setUser(updated)
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to change password.'
        return { ok: false, message }
      }
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
