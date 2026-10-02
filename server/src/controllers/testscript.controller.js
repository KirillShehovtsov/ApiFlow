import * as testScriptService from '../services/testscript.service.js';

// GET /api/test-scripts/request/:requestId
export const getByRequest = async (req, res, next) => {
  try {
    const requestId = parseInt(req.params.requestId);
    const data = await testScriptService.getByRequest(requestId, req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// GET /api/test-scripts/:id
export const getById = async (req, res, next) => {
  try {
    const data = await testScriptService.getById(parseInt(req.params.id), req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// POST /api/test-scripts
// Body: { requestId, name, code }
export const create = async (req, res, next) => {
  try {
    const { requestId, name, code } = req.body;
    if (!requestId || !name || code === undefined) {
      return res.status(400).json({ success: false, message: 'requestId, name and code are required' });
    }
    const data = await testScriptService.create(req.user.id, { requestId: parseInt(requestId), name, code });
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

// PUT /api/test-scripts/:id
export const update = async (req, res, next) => {
  try {
    const data = await testScriptService.update(parseInt(req.params.id), req.user.id, req.body);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// DELETE /api/test-scripts/:id
export const remove = async (req, res, next) => {
  try {
    await testScriptService.remove(parseInt(req.params.id), req.user.id);
    res.json({ success: true, message: 'Test script deleted' });
  } catch (err) { next(err); }
};

// POST /api/test-scripts/:id/run
// Body: { status, body, headers, durationMs } — данные ответа сервера
export const run = async (req, res, next) => {
  try {
    const { status, body, headers, durationMs } = req.body;
    if (status === undefined) {
      return res.status(400).json({ success: false, message: 'Response data (status, body, headers, durationMs) is required' });
    }
    const data = await testScriptService.run(
      parseInt(req.params.id),
      req.user.id,
      { status, body, headers, durationMs }
    );
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// GET /api/test-scripts/:id/runs — история запусков
export const getRuns = async (req, res, next) => {
  try {
    const data = await testScriptService.getRuns(parseInt(req.params.id), req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};
