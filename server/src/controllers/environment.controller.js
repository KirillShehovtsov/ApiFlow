import * as environmentService from '../services/environment.service.js';

// GET /api/environments — все окружения пользователя
export const getAll = async (req, res, next) => {
  try {
    const data = await environmentService.getAll(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// GET /api/environments/:id — одно окружение
export const getById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const data = await environmentService.getById(id, req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// POST /api/environments — создать окружение
// Body: { name: string, variables?: [{ key, value }] }
export const create = async (req, res, next) => {
  try {
    const { name, variables } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    const data = await environmentService.create(req.user.id, { name, variables });
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// PUT /api/environments/:id — обновить окружение
// Body: { name?: string, variables?: [{ key, value }] }
export const update = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const data = await environmentService.update(id, req.user.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/environments/:id — удалить окружение
export const remove = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    await environmentService.remove(id, req.user.id);
    res.json({ success: true, message: 'Environment deleted' });
  } catch (err) {
    next(err);
  }
};
