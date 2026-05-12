import pool from './db.js';
import { parsePagination } from '../utils/pagination.js';

export default {
  // ==================== Campaign ====================
  async listCampaigns({ page = 1, pageSize = 20, type, status } = {}) {
    const conditions = [];
    const params = [];
    if (type) { conditions.push('type = ?'); params.push(type); }
    if (status !== undefined) { conditions.push('status = ?'); params.push(status); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM campaign ${where}`, params);
    const { offset } = parsePagination({ page, pageSize });
    const [rows] = await pool.query(`SELECT id,title,type,description,cover_url,rules,reward_type,reward_value,start_time,end_time,status,target_audience,tenant_id,sort_order,create_time,update_time FROM campaign ${where} ORDER BY sort_order DESC, create_time DESC LIMIT ?,?`, [...params, offset, pageSize]);
    return { list: rows, total, page, pageSize };
  },

  async getCampaign(id) {
    const [rows] = await pool.query('SELECT id,title,type,description,cover_url,rules,reward_type,reward_value,start_time,end_time,status,target_audience,tenant_id,sort_order,create_time,update_time FROM campaign WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async createCampaign(data) {
    const fields = ['title','type','description','cover_url','rules','reward_type','reward_value','start_time','end_time','status','target_audience','tenant_id','sort_order'];
    const vals = fields.map(f => data[f] ?? null);
    const placeholders = fields.map(() => '?').join(',');
    const [result] = await pool.query(`INSERT INTO campaign (${fields.join(',')}) VALUES (${placeholders})`, vals);
    return result.insertId;
  },

  async updateCampaign(id, tenantId, data) {
    const fields = ['title','type','description','cover_url','rules','reward_type','reward_value','start_time','end_time','status','target_audience','sort_order'];
    const sets = [];
    const params = [];
    for (const f of fields) {
      if (data[f] !== undefined) { sets.push(`${f} = ?`); params.push(data[f]); }
    }
    if (!sets.length) return false;
    params.push(id, tenantId);
    const [result] = await pool.query(`UPDATE campaign SET ${sets.join(', ')} WHERE id = ? AND tenant_id = ?`, params);
    return result.affectedRows > 0;
  },

  async deleteCampaign(id, tenantId) {
    const [result] = await pool.query('DELETE FROM campaign WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    return result.affectedRows > 0;
  },

  // ==================== Coupon ====================
  async listCoupons({ page = 1, pageSize = 20, status, campaignId } = {}) {
    const conditions = [];
    const params = [];
    if (status !== undefined) { conditions.push('status = ?'); params.push(status); }
    if (campaignId) { conditions.push('campaign_id = ?'); params.push(campaignId); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM coupon ${where}`, params);
    const { offset } = parsePagination({ page, pageSize });
    const [rows] = await pool.query(`SELECT id,code,name,type,value,min_order_amount,max_discount,total_quantity,used_quantity,per_user_limit,start_time,end_time,status,campaign_id,create_time,update_time FROM coupon ${where} ORDER BY create_time DESC LIMIT ?,?`, [...params, offset, pageSize]);
    return { list: rows, total, page, pageSize };
  },

  async getCoupon(id) {
    const [rows] = await pool.query('SELECT id,code,name,type,value,min_order_amount,max_discount,total_quantity,used_quantity,per_user_limit,start_time,end_time,status,campaign_id,create_time,update_time FROM coupon WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async createCoupon(data) {
    const fields = ['code','name','type','value','min_order_amount','max_discount','total_quantity','per_user_limit','start_time','end_time','status','campaign_id'];
    const vals = fields.map(f => data[f] ?? null);
    const [result] = await pool.query(`INSERT INTO coupon (${fields.join(',')}) VALUES (${fields.map(() => '?').join(',')})`, vals);
    return result.insertId;
  },

  async updateCoupon(id, campaignId, data) {
    const fields = ['code','name','type','value','min_order_amount','max_discount','total_quantity','per_user_limit','start_time','end_time','status'];
    const sets = [];
    const params = [];
    for (const f of fields) {
      if (data[f] !== undefined) { sets.push(`${f} = ?`); params.push(data[f]); }
    }
    if (!sets.length) return false;
    params.push(id, campaignId);
    const [result] = await pool.query(`UPDATE coupon SET ${sets.join(', ')} WHERE id = ? AND campaign_id = ?`, params);
    return result.affectedRows > 0;
  },

  async deleteCoupon(id, campaignId) {
    const [result] = await pool.query('DELETE FROM coupon WHERE id = ? AND campaign_id = ?', [id, campaignId]);
    return result.affectedRows > 0;
  },

  async getUserCoupons({ page = 1, pageSize = 20, userId, status } = {}) {
    const conditions = [];
    const params = [];
    if (userId) { conditions.push('uc.user_id = ?'); params.push(userId); }
    if (status !== undefined) { conditions.push('uc.status = ?'); params.push(status); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM user_coupon uc ${where}`, params);
    const { offset } = parsePagination({ page, pageSize });
    const [rows] = await pool.query(`SELECT uc.id,uc.user_id,uc.coupon_id,uc.status,uc.used_order_id,uc.obtain_time,uc.use_time,uc.create_time, c.name as coupon_name, c.type as coupon_type, c.value as coupon_value FROM user_coupon uc LEFT JOIN coupon c ON uc.coupon_id = c.id ${where} ORDER BY uc.create_time DESC LIMIT ?,?`, [...params, offset, pageSize]);
    return { list: rows, total, page, pageSize };
  },

  // ==================== Announcement ====================
  async listAnnouncements({ page = 1, pageSize = 20, type, status } = {}) {
    const conditions = [];
    const params = [];
    if (type) { conditions.push('type = ?'); params.push(type); }
    if (status !== undefined) { conditions.push('status = ?'); params.push(status); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM announcement ${where}`, params);
    const { offset } = parsePagination({ page, pageSize });
    const [rows] = await pool.query(`SELECT id,title,content,type,level,is_pinned,target_audience,publish_time,status,create_by,create_time,update_time FROM announcement ${where} ORDER BY is_pinned DESC, create_time DESC LIMIT ?,?`, [...params, offset, pageSize]);
    return { list: rows, total, page, pageSize };
  },

  async getAnnouncement(id) {
    const [rows] = await pool.query('SELECT id,title,content,type,level,is_pinned,target_audience,publish_time,status,create_by,create_time,update_time FROM announcement WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async createAnnouncement(data) {
    const fields = ['title','content','type','level','is_pinned','target_audience','publish_time','status','create_by'];
    const vals = fields.map(f => data[f] ?? null);
    const [result] = await pool.query(`INSERT INTO announcement (${fields.join(',')}) VALUES (${fields.map(() => '?').join(',')})`, vals);
    return result.insertId;
  },

  async updateAnnouncement(id, createBy, data) {
    const fields = ['title','content','type','level','is_pinned','target_audience','publish_time','status'];
    const sets = [];
    const params = [];
    for (const f of fields) {
      if (data[f] !== undefined) { sets.push(`${f} = ?`); params.push(data[f]); }
    }
    if (!sets.length) return false;
    params.push(id, createBy);
    const [result] = await pool.query(`UPDATE announcement SET ${sets.join(', ')} WHERE id = ? AND create_by = ?`, params);
    return result.affectedRows > 0;
  },

  async deleteAnnouncement(id, createBy) {
    const [result] = await pool.query('DELETE FROM announcement WHERE id = ? AND create_by = ?', [id, createBy]);
    return result.affectedRows > 0;
  },
};
