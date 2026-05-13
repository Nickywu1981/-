import pool from './db.js';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';

const table = 'geo_rules';
const COLS = 'id, rule_name, country_codes, platform_codes, locale, blocked_models, review_level, output_constraints, priority, enabled, description, create_time, update_time';

export const listAll = async () => {
  const [rows] = await pool.query(`SELECT ${COLS} FROM ${table} ORDER BY priority DESC, id ASC LIMIT 200`);
  return rows;
};

export const getById = async (id) => {
  const [rows] = await pool.query(`SELECT ${COLS} FROM ${table} WHERE id = ? LIMIT 1`, [id]);
  return rows[0] || null;
};

export const getMatchingRules = async (countryCode, platformCode) => {
  const [rows] = await pool.query(
    `SELECT ${COLS} FROM ${table} WHERE enabled = 1 AND (
      JSON_CONTAINS(country_codes, ?) OR country_codes IS NULL
    )
    ORDER BY priority DESC LIMIT 200`,
    [JSON.stringify(countryCode)],
  );
  return rows;
};

export const insert = async (fields) => {
  const allowed = ['rule_name', 'country_codes', 'platform_codes', 'locale', 'blocked_models', 'review_level', 'output_constraints', 'priority', 'enabled', 'description'];
  const keys = [];
  const vals = [];
  const placeholders = [];
  for (const k of allowed) {
    if (fields[k] !== undefined) {
      keys.push(k);
      vals.push(typeof fields[k] === 'object' ? JSON.stringify(fields[k]) : fields[k]);
      placeholders.push('?');
    }
  }
  if (keys.length === 0) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
  const [result] = await pool.query(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders.join(', ')})`, vals);
  return result.insertId;
};

export const update = async (id, fields) => {
  const allowed = ['rule_name', 'country_codes', 'platform_codes', 'locale', 'blocked_models', 'review_level', 'output_constraints', 'priority', 'enabled', 'description'];
  const sets = [];
  const vals = [];
  for (const k of allowed) {
    if (fields[k] !== undefined) {
      sets.push(`${k} = ?`);
      vals.push(typeof fields[k] === 'object' ? JSON.stringify(fields[k]) : fields[k]);
    }
  }
  if (sets.length === 0) return 0;
  vals.push(id);
  const [result] = await pool.query(`UPDATE ${table} SET ${sets.join(', ')} WHERE id = ?`, vals);
  return result.affectedRows;
};

export const remove = async (id) => {
  const [result] = await pool.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
  return result.affectedRows;
};
