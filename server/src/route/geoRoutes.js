/**
 * Geo-IP 语言建议
 * 通过请求 IP 判断访客所在国家，返回建议语言代码
 *
 * 优先级：国内 IP → zh，英语国家 → en，西语国家 → es，默认 → zh
 */
import { Router } from 'express';
import { rateLimiter } from '../middleware/rateLimiter.js';
import * as ctrl from '../controller/geoController.js';

const router = Router();

router.get('/suggest-locale', rateLimiter, ctrl.suggestLocale);

export default router;
