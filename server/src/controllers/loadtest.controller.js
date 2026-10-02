let loadTestService = null;

const getLoadTestService = async () => {
  if (!loadTestService) {
    try {
      loadTestService = await import('../services/loadtest.service.js');
    } catch (error) {
      console.warn('Failed to load loadtest service:', error.message);
      // Создаем заглушку
      loadTestService = {
        startLoadTest: async () => {
          throw new Error('Load testing service is not available.');
        },
        getLoadTestStatus: async () => {
          throw new Error('Load testing service is not available.');
        },
        getLoadTestReport: async () => {
          throw new Error('Load testing service is not available.');
        },
        getLoadTestHistory: async () => {
          throw new Error('Load testing service is not available.');
        }
      };
    }
  }
  return loadTestService;
};

export const start = async (req, res, next) => {
  try {
    const service = await getLoadTestService();
    const data = await service.startLoadTest(req.user.id, req.body || {});
    res.status(202).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const status = async (req, res, next) => {
  try {
    const service = await getLoadTestService();
    const data = await service.getLoadTestStatus(req.user.id, req.params.jobId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const report = async (req, res, next) => {
  try {
    const service = await getLoadTestService();
    const data = await service.getLoadTestReport(req.user.id, req.params.jobId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const history = async (req, res, next) => {
  try {
    const service = await getLoadTestService();
    const limit = parseInt(req.query.limit) || 20;
    const data = await service.getLoadTestHistory(req.user.id, limit);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

