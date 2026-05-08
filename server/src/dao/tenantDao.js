import pool from './db.js';


export default {
  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM tenant WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async findByCode(code) {
    const [rows] = await pool.query('SELECT * FROM tenant WHERE code = ?', [code]);
    return rows[0] || null;
  },

  async list({ page = 1, pageSize = 20, status, planType, keyword } = {}) {
    const conditions = [];
    const params = [];
    if (status !== undefined) { conditions.push('status = ?'); params.push(status); }
    if (planType) { conditions.push('plan_type = ?'); params.push(planType); }
    if (keyword) { conditions.push('(name LIKE ? OR code LIKE ? OR contact_name LIKE ?)'); params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM tenant ${where}`, params);
    const offset = (page - 1) * pageSize;
    params.push(offset, pageSize);
    const [rows] = await pool.query(`SELECT * FROM tenant ${where} ORDER BY create_time DESC LIMIT ?, ?`, params);
    return { list: rows, total: countRows[0].total, page, pageSize };
  },

  async create(data) {
    const [result] = await pool.query(
      'INSERT INTO tenant (name, code, logo, domain, plan_type, status, contact_name, contact_phone, contact_email, address, max_users, quota_images, quota_video, expire_time) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [data.name, data.code, data.logo || '', data.domain || '', data.plan_type || 'free', data.status ?? 1, data.contact_name || '', data.contact_phone || '', data.contact_email || '', data.address || '', data.max_users ?? 5, data.quota_images ?? 100, data.quota_video ?? 10, data.expire_time || null],
    );
    return result.insertId;
  },

  async update(id, data) {
    const fields = [];
    const params = [];
    for (const [k, v] of Object.entries(data)) {
      if (['name','code','logo','domain','plan_type','status','contact_name','contact_phone','contact_email','address','max_users','quota_images','quota_video','expire_time'].includes(k)) {
        fields.push(`${k} = ?`);
        params.push(v);
      }
    }
    if (!fields.length) return false;
    params.push(id);
    const [result] = await pool.query(`UPDATE tenant SET ${fields.join(', ')} WHERE id = ?`, params);
    return result.affectedRows > 0;
  },

  async updateStatus(id, status) {
    const [result] = await pool.query('UPDATE tenant SET status = ? WHERE id = ?', [status, id]);
    return result.affectedRows > 0;
  },

  async delete(id) {
    const [result] = await pool.query('DELETE FROM tenant WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },
};
