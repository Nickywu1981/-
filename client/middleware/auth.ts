/**
 * Named auth middleware — satisfies definePageMeta({ middleware: ['auth'] }) references.
 * Actual authentication is handled globally by auth.global.ts for all routes.
 */
export default defineNuxtRouteMiddleware(() => {})
