import Queues from '../../common/queues';
import l from '../../common/logger';

export class BullService {
  constructor() {
    this.mgr = Queues.instance;
  }

  getQueue(name) {
    return this.mgr.queues.find(q => q.name === name);
  }

  getQueueInfo(queue) {
    const q = this.getQueue(queue);
    return q.getJobCounts()
      .timeout(2000, `Unable to get job counts from ${queue}`)
      .then(counts => Object.keys(counts).reduce((acc, cur) => acc + counts[cur], 0))
      .then(counts => {
        const {
          name,
          token,
          keyPrefix,
        } = q;
        return {
          name,
          totalJobs: counts,
          token,
          keyPrefix,
          isReady: q._initializing.isFulfilled(),
        };
      });
  }

  getJob(queue, id) {
    return this.getQueue(queue)
      .getJob(id)
      .timeout(2000, `Unable to retrieve job ${id} from ${queue}`)
      .then(job => job.getState().then(state => ({ job, state })));
  }

  getJobState(job) {
    return job.getState();
  }

  createJob(queue, obj) {
    return this.getQueue(queue)
      .add(obj)
      .timeout(2000, `Unable to create new job in ${queue}`);
  }

  removeJob(queue, id) {
    return this.getJob(queue, id)
      .timeout(2000, `Unable to remove job ${id} from ${queue}`)
      .then(result => {
        const key = result.job.lockKey();
        return result.job.releaseLock(key).then(() => result.job.remove());
      });
  }

  updateJob(queue, obj) {
    return this.getJob(queue, obj.id)
      .timeout(2000, `Unable to update job ${obj.id} in ${queue}`)
      .then(result => result.job.update(obj));
  }

  retryJob(queue, id) {
    return this.getJob(queue, id)
      .timeout(2000, `Unable to retry job ${id} in ${queue}`)
      .then(result => result.job.retry());
  }

  queues() {
    return Promise.resolve(this.mgr.queues.map(q => q.name));
  }

  queue(name) {
    return Promise.resolve(this.getQueue(name));
  }

  jobStates(name) {
    return this.getQueue(name).getJobCounts()
      .timeout(2000, `Unable to retrieve jobs from ${name}`);
  }

  getWaiting(name) {
    return this.getQueue(name).getWaiting()
      .timeout(2000, `Unable to get waiting jobs from ${name}`);
  }

  getWaitCount(name) {
    return this.getQueue(name).getWaitCount()
      .timeout(2000, `Unable to get waiting jobs from ${name}`);
  }

  getActive(name) {
    return this.getQueue(name).getActive()
      .timeout(2000, `Unable to get active jobs from ${name}`);
  }

  getActiveCount(name) {
    return this.getQueue(name).getActiveCount()
      .timeout(2000, `Unable to get active jobs from ${name}`);
  }

  getDelayed(name) {
    return this.getQueue(name).getDelayed()
      .timeout(2000, `Unable to get delayed jobs from ${name}`);
  }

  getDelayedCount(name) {
    return this.getQueue(name).getDelayedCount()
      .timeout(2000, `Unable to get delayed jobs from ${name}`);
  }

  getCompleted(name) {
    return this.getQueue(name).getCompleted()
      .timeout(2000, `Unable to get completed jobs from ${name}`);
  }

  getCompltedCount(name) {
    return this.getQueue(name).getCompltedCount()
      .timeout(2000, `Unable to get completed jobs from ${name}`);
  }

  getFailed(name) {
    return this.getQueue(name).getFailed()
      .timeout(2000, `Unable to get failed jobs from ${name}`);
  }

  getFailedCount(name) {
    return this.getQueue(name).getFailedCount()
      .timeout(2000, `Unable to get failed jobs from ${name}`);
  }

  emptyQueue(name) {
    return this.getQueue(name).empty()
      .timeout(2000, `Unable to empty queue ${name}`);
  }
}

export default new BullService();
