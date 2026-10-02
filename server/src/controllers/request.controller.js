import * as requestService from '../services/request.service.js';

export const getByCollection = async (req, res, next) => {
  try {
    const collectionId = parseInt(req.params.collectionId);
    const data = await requestService.getByCollection(collectionId, req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const data = await requestService.getById(id, req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const { name, method, url, collectionId } = req.body;
    if (!name || !method || !url || !collectionId) {
      return res.status(400).json({ success: false, message: 'name, method, url, collectionId are required' });
    }

    const data = await requestService.create(req.user.id, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const data = await requestService.update(id, req.user.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    await requestService.remove(id, req.user.id);
    res.json({ success: true, message: 'Request deleted' });
  } catch (err) {
    next(err);
  }
};