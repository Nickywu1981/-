import * as collectionDao from '../dao/collectionDao.js';

export async function listByUser(userId, query) { return collectionDao.listByUser(userId, query); }
export async function getById(id, userId) { return collectionDao.getById(id, userId); }
export async function create(data) { return collectionDao.create(data); }
export async function update(id, userId, data) { return collectionDao.update(id, userId, data); }
export async function remove(id, userId) { return collectionDao.remove(id, userId); }
