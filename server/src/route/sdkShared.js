/**
 * MemFocus SDK — Shared Utilities & Common Schemas
 *
 * Imported by all sdk*Routes.js domain files.
 */

import { z } from 'zod';

/** Helper: create a param schema that coerces a numeric string to Number */
export const numericParam = (name) => z.object({ [name]: z.string().regex(/^\d+$/).transform(Number) });

/** Common param schemas reused across domain routers */
export const userIdParamSchema = numericParam('userId');
export const taskIdParamSchema = numericParam('taskId');
export const paramsWithTaskId = z.object({ taskId: z.string().min(1) });
