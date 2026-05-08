import * as collectionDao from '../dao/collectionDao.js';

export async function listByUser(userId, query) { return collectionDao.listByUser(userId, query); }
export async function getById(id) { return collectionDao.getById(id); }
export async function create(data) { return collectionDao.create(data); }
export async function update(id, data) { return collectionDao.update(id, data); }
export async function remove(id) { return collectionDao.remove(id); }
