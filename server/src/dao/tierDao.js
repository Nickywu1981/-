import pool from './db.js';

export async function getUserPlan(userId) {
  const [rows] = await pool.execute(
    'SELECT p.level FROM user_plans up JOIN plans p ON up.plan_id = p.id WHERE up.user_id = ? AND up.status = 1 AND up.expire_time > NOW() LIMIT 1',
    [userId],
  );
  return rows[0]?.level || 'free';
}

export async function countTodayTasks(userId, category) {
  const [rows] = await pool.execute(
    'SELECT COUNT(*) AS cnt FROM tasks WHERE user_id = ? AND category = ? AND DATE(create_time) = CURDATE()',
    [userId, category],
  );
  return rows[0].cnt;
}

export default { getUserPlan, countTodayTasks };
