import { exportCollection, importCollection } from '../services/importexport.service.js';

// GET /api/collections/:id/export
export const exportCol = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const data = await exportCollection(id, req.user.id);

    // Отдаём как файл для скачивания
    const filename = `collection-${id}-${Date.now()}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(data);
  } catch (err) {
    next(err);
  }
};

// POST /api/collections/import
// Body: JSON-объект экспорта
export const importCol = async (req, res, next) => {
  try {
    const data = req.body;
    const collection = await importCollection(req.user.id, data);
    res.status(201).json({ success: true, data: collection });
  } catch (err) {
    next(err);
  }
};
