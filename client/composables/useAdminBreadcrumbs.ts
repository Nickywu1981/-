export function useAdminBreadcrumbs(navGroups: any[], rootLabel: string, rootRoute: string) {
  const route = useRoute()
  return computed(() => {
    const items = [{ label: rootLabel, route: rootRoute }]
    for (const g of navGroups) {
      const it = g.items.find((i: any) => route.path === i.route || route.path.startsWith(i.route + '/'))
      if (it) { items.push({ label: g.label, route: '' }, { label: it.label, route: it.route }); break }
    }
    return items
  })
}
