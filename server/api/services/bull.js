import Queues from '../../common/queues';
import l from '../../common/logger';

export class BullService {
  constructor() {
    this.mgr = Queues.instance;
  }

  getQueue(name) {
    return this.mgr.queues.find(q => q.name === name);
  }

  getJob(queue, id) {
    return this.getQueue(queue).getJob(id);
  }

  createJob(queue, obj) {
    return this.getQueue(queue).add(obj);
  }

  removeJob(queue, id) {
    return this.getJob(queue, id)
      .then(job => job.remove());
  }

  updateJob(queue, obj) {
    return this.getJob(queue, obj.id)
      .then(job => job.update(obj));
  }

  retryJob(queue, id) {
    return this.getJob(queue, id)
      .then(job => job.retry());
  }

  queues() {
    return Promise.resolve(this.mgr.queues.map(q => q.name));
  }

  queue(name) {
    return Promise.resolve(this.getQueue(name));
  }

  jobStates(name) {
    return this.getQueue(name).getJobCounts();
  }

  getWaiting(name) {
    return this.getQueue(name).getWaiting();
  }

  getWaitCount(name) {
    return this.getQueue(name).getWaitCount();
  }

  getActive(name) {
    return this.getQueue(name).getActive();
  }

  getActiveCount(name) {
    return this.getQueue(name).getActiveCount();
  }

  getDelayed(name) {
    return this.getQueue(name).getDelayed();
  }

  getDelayedCount(name) {
    return this.getQueue(name).getDelayedCount();
  }

  getCompleted(name) {
    return this.getQueue(name).getCompleted();
  }

  getCompltedCount(name) {
    return this.getQueue(name).getCompltedCount();
  }

  getFailed(name) {
    return this.getQueue(name).getFailed();
  }

  getFailedCount(name) {
    return this.getQueue(name).getFailedCount();
  }

  emptyQueue(name) {
    return this.getQueue(name).empty();
  }
}

export default new BullService();
