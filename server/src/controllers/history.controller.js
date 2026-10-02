import * as historyService from '../services/history.service.js';

export const getAll = async (req, res, next) => {
  try {
    // Можно передать ?limit=20 в query параметрах
    const limit = parseInt(req.query.limit) || 50;
    const data = await historyService.getAll(req.user.id, limit);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const data = await historyService.getById(id, req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const clear = async (req, res, next) => {
  try {
    await historyService.clear(req.user.id);
    res.json({ success: true, message: 'History cleared' });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    await historyService.remove(id, req.user.id);
    res.json({ success: true, message: 'History item deleted' });
  } catch (err) {
    next(err);
  }
};