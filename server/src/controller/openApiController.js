/**
 * Open API Controller — 请求/响应处理层
 * G5 后端开发 | G-03 修复
 */
import { wrapController } from '../utils/wrapController.js';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import * as openApiService from '../services/openApiService.js';

export const ping = wrapController(async (req, res, next) => { success(res, await openApiService.ping(req.tenantId)); } catch (e) { next(e); }
}

export const getUsage = wrapController(async (req, res, next) => { success(res, await openApiService.getUsage(req.tenantId, req.apiKeyRecord)); } catch (e) { next(e); }
}

export const removeBackground = wrapController(async (req, res, next) => {
    const result = await openApiService.removeBackground(req.tenantId, req.body.imageUrl);
    success(res, result);
  } catch (e) { next(e); }
}

export const generateScene = wrapController(async (req, res, next) => {
    const result = await openApiService.generateScene(req.tenantId, req.body.imageUrl, req.body.sceneType);
    success(res, result);
  } catch (e) { next(e); }
}

export const retouchImage = wrapController(async (req, res, next) => {
    const result = await openApiService.retouchImage(req.tenantId, req.body.imageUrl);
    success(res, result);
  } catch (e) { next(e); }
}

export const generateVideo = wrapController(async (req, res, next) => {
    const result = await openApiService.generateVideo(req.tenantId, req.body.imageUrls, {
      effect: req.body.effect,
      duration: req.body.duration,
    });
    success(res, result);
  } catch (e) { next(e); }
}
