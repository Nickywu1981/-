import helpDao from '../dao/helpDao.js';

export default {
  async getFaqs({ keyword = '', page = 1, pageSize = 50 } = {}) {
    const { list, total } = await helpDao.listFaqs({ keyword, page, pageSize });
    return { list, total, page, pageSize };
  },

  async getFaqById(id) {
    return helpDao.getFaqById(id);
  },

  async createFaq({ question, answer, category, sort }) {
    return helpDao.insertFaq({ question, answer, category, sort: sort || 0 });
  },

  async updateFaq(id, data) {
    return helpDao.updateFaq(id, data);
  },

  async deleteFaq(id) {
    return helpDao.deleteFaq(id);
  },
};
