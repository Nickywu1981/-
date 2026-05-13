interface NavItem {
  label: string
  route: string
  items?: NavItem[]
}

interface NavGroup {
  label: string
  items: NavItem[]
}

export function useAdminBreadcrumbs(navGroups: NavGroup[], rootLabel: string, rootRoute: string) {
  const route = useRoute()
  return computed(() => {
    const items = [{ label: rootLabel, route: rootRoute }]
    for (const g of navGroups) {
      const it = g.items.find((i: NavItem) => route.path === i.route || route.path.startsWith(i.route + '/'))
      if (it) { items.push({ label: g.label, route: '' }, { label: it.label, route: it.route }); break }
    }
    return items
  })
}
