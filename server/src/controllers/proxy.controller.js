import * as proxyService from '../services/proxy.service.js';

export const execute = async (req, res, next) => {
  try {
    // environmentId — опциональный, если передан — подставляются переменные {{varName}}
    const { method, url, headers, queryParams, body, environmentId } = req.body;

    if (!method || !url) {
      return res.status(400).json({ success: false, message: 'method and url are required' });
    }

    const result = await proxyService.executeRequest(req.user.id, {
      method,
      url,
      headers,
      queryParams,
      body,
      environmentId,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};