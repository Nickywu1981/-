import helpDao from '../dao/helpDao.js';
import { BusinessError } from '../utils/businessError.js';

export default {
  async getFaqs({ keyword = '', page = 1, pageSize = 50 } = {}) {
    const { list, total } = await helpDao.listFaqs({ keyword, page, pageSize });
    return { list, total, page, pageSize };
  },

  async getFaqById(id) {
    return helpDao.getFaqById(id);
  },

  async createFaq({ question, answer, category, sort }) {
    if (!question || !answer) throw new BusinessError(400, '问题和答案不能为空');
    return helpDao.insertFaq({ question, answer, category, sort: sort || 0 });
  },

  async updateFaq(id, data) {
    if (!data || Object.keys(data).length === 0) throw new BusinessError(400, '没有可更新的字段');
    return helpDao.updateFaq(id, data);
  },

  async deleteFaq(id) {
    return helpDao.deleteFaq(id);
  },
};
