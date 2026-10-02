/**
 * In-memory очередь задач (замена BullMQ для работы без Redis)
 * Использует JavaScript Map для хранения задач
 */
const queuesByName = new Map();

class MemoryQueue {
  constructor(name) {
    this.name = name;
    this.jobs = new Map();
    this.jobCounter = 0;
    this.workers = [];
    queuesByName.set(name, this);
  }

  /**
   * Добавить задачу в очередь
   */
  async add(jobName, data, options = {}) {
    const jobId = String(++this.jobCounter);
    const job = {
      id: jobId,
      name: jobName,
      data,
      options,
      progress: 0,
      returnValue: null,
      failedReason: null,
      state: 'waiting',
      createdAt: new Date(),
      startedAt: null,
      completedAt: null,
    };
    
    this.jobs.set(jobId, job);
    
    // Запускаем обработку асинхронно
    setImmediate(() => this.processJob(jobId));
    
    return job;
  }

  /**
   * Получить задачу по ID
   */
  async getJob(jobId) {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Обновить прогресс задачи
   */
  async updateProgress(jobId, progress) {
    const job = this.jobs.get(jobId);
    if (job) {
      job.progress = progress;
    }
  }

  /**
   * Получить состояние задачи
   */
  async getJobState(jobId) {
    const job = this.jobs.get(jobId);
    return job ? job.state : 'unknown';
  }

  /**
   * Обработка задачи (вызывается автоматически при добавлении)
   */
  async processJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job || this.workers.length === 0) return;

    job.state = 'active';
    job.startedAt = new Date();

    try {
      // Вызываем все worker'ы
      for (const worker of this.workers) {
        const result = await worker.processor(job);
        job.returnValue = result;
      }
      
      job.state = 'completed';
      job.completedAt = new Date();
    } catch (error) {
      job.state = 'failed';
      job.failedReason = error.message;
      job.completedAt = new Date();
      
      // Вызываем обработчик ошибок
      for (const worker of this.workers) {
        if (worker.onFailedCallback) {
          worker.onFailedCallback(job, error);
        }
      }
    }
  }
}

class MemoryWorker {
  constructor(queueName, processor, options = {}) {
    this.queueName = queueName;
    this.processor = processor;
    this.connection = options.connection;
    this.onFailedCallback = null;
    const queue = queuesByName.get(queueName);
    if (queue) {
      queue.workers.push(this);
    }
  }

  on(event, callback) {
    if (event === 'failed') {
      this.onFailedCallback = callback;
    }
  }
}

export { MemoryQueue, MemoryWorker };
