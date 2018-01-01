import handbrake from './handbrake';
import avconv from './avconv';

export default function (job) {
  switch (job.data.type) {
    case 'handbrake':
    case 'handbrakecli':
      return handbrake.process(job);
    case 'avconv':
      return avconv.process(job);
    default:
      return Promise.reject(new Error(`unkown job type: ${job.data.type}`));
  }
}
