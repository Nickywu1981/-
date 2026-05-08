import pool from './db.js';

export default {
  async listFaqs({ keyword, page = 1, pageSize = 50 } = {}) {
    const offset = (page - 1) * pageSize;
    let where = 'WHERE status = 1';
    const params = [];
    if (keyword) {
      where += ' AND (question LIKE ? OR answer LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    params.push(pageSize, offset);
    const [rows] = await pool.query(`SELECT * FROM help_faq ${where} ORDER BY sort ASC, id DESC LIMIT ? OFFSET ?`, params);
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM help_faq ${where}`, params);
    return { list: rows, total };
  },

  async getFaqById(id) {
const [rows] = await pool.query('SELECT * FROM help_faq WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async insertFaq(data) {
const [result] = await pool.query('INSERT INTO help_faq SET ?', data);
    return result.insertId;
  },

  async updateFaq(id, data) {
await pool.query('UPDATE help_faq SET ? WHERE id = ?', [data, id]);
  },

  async deleteFaq(id) {
await pool.query('DELETE FROM help_faq WHERE id = ?', [id]);
  },

  async insertSeed() {
const [[{ cnt }]] = await pool.query('SELECT COUNT(*) as cnt FROM help_faq');
    if (cnt > 0) return;
    const faqs = [
      ['支持哪些电商平台？', '淘宝、拼多多、抖音、小红书、视频号、亚马逊、Temu、Shein、TikTok Shop、美客多、Ozon、Shopee、Lazada — 共13个平台，一键适配官方标准尺寸。', 'platform', 1],
      ['免费版有什么限制？', '免费版每天可获得20点算力，可体验所有功能。作品保存7天，导出带水印，批量上限5张/次。升级会员解锁高清无限制。', 'account', 2],
      ['怎么开始做一张主图？', '首页点击"做主图"→上传商品照片→选择目标平台→选择风格（简约/促销/品牌）→等待5秒自动生成3张不同风格主图，挑最满意那张用。', 'usage', 3],
      ['批量处理怎么用？', '首页点击"做批量"→拖入文件夹或多选图片→选择操作（抠图/加白底/统一尺寸等）→选目标平台→点开始，后台自动排队处理，完成后通知下载ZIP包。', 'usage', 4],
      ['生成效果不好怎么办？', '可多试几次（每次可能略有差异），在不同风格之间切换对比。如持续不满意，可联系客服人工处理。', 'usage', 5],
      ['支持退款吗？', '会员购买后7天内无使用记录可全额退款。如有使用记录按天折算。详情请看会员页面的退款政策。', 'account', 6],
      ['视频生成要多久？', '10秒短视频约30秒生成，60秒长视频约3分钟。批量视频自动排队，可在"我的素材库"查看进度。', 'usage', 7],
      ['BGM和字幕可以自定义吗？', '系统自动匹配BGM和字幕，生成后也可在素材库点击编辑替换自己的BGM或修改字幕文案。', 'usage', 8],
      ['忘记密码怎么办？', '登录页点击"忘记密码"，输入用户名，系统会发重置链接到你注册的邮箱。', 'account', 9],
      ['如何联系客服？', '邮件客服 support@movio.ai，工作时间周一至周五 9:00-18:00。', 'account', 10],
      ['支持哪些图片格式？', '支持 JPG、PNG、WebP，最大 50MB。建议上传 800x800 以上清晰原图，AI 处理效果最佳。', 'usage', 11],
      ['会员到期后作品还在吗？', '作品保留 30 天，到期后可续费恢复。建议到期前导出重要作品。', 'account', 12],
    ];
    for (const [q, a, cat, sort] of faqs) {
      await pool.query('INSERT INTO help_faq (question, answer, category, sort) VALUES (?,?,?,?)', [q, a, cat, sort]);
    }
  },
};
