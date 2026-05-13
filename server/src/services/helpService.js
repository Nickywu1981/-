import helpDao from '../dao/helpDao.js';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export default {
  async getFaqs({ keyword = '', page = 1, pageSize = 50 } = {}) {
    const { list, total } = await helpDao.listFaqs({ keyword, page, pageSize });
    return { list, total, page, pageSize };
  },

  async getFaqById(id) {
    return helpDao.getFaqById(id);
  },

  async createFaq({ question, answer, category, sort }) {
    if (!question || !answer) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
    return helpDao.insertFaq({ question, answer, category, sort: sort || 0 });
  },

  async updateFaq(id, data) {
    if (!data || Object.keys(data).length === 0) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
    return helpDao.updateFaq(id, data);
  },

  async deleteFaq(id) {
    const affected = await helpDao.deleteFaq(id);
    if (affected === 0) throw new BusinessError(ERROR_CODE.NOT_FOUND);
  },
};
