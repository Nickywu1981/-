export function useLogout(loginRoute = '/login') {
  const router = useRouter()

  async function logout() {
    try {
      await $fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
      router.push(loginRoute)
    } catch (e) {
      if (import.meta.dev) console.error('Logout error:', e)
      router.push(loginRoute)
    }
  }

  return { logout }
}
