import * as collectionService from '../services/collection.service.js';

export const getAll = async (req, res, next) => {
  try {
    const data = await collectionService.getAll(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

    const data = await collectionService.create(req.user.id, { name });
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const data = await collectionService.update(id, req.user.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    await collectionService.remove(id, req.user.id);
    res.json({ success: true, message: 'Collection deleted' });
  } catch (err) {
    next(err);
  }
};