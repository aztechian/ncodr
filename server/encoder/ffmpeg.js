// import { exec } from 'child_process';
// import path from 'path';
// import Buffer from 'buffer';
// import logger from '../common/logger';

// https://azopcorp.com/blog/howtoparseffmpegstderouttodisplayjobprogress

export class Ffmpeg {
  // process(job) {
  //   let length = null;
  //   let currenttime = 0;
  //   const regex = /Duration:(.*), start:/;
  //   const regex2 = /time=(.*) bitrate/;

  //   const ffmpeg = exec('ffmpeg', ['-i',
  //     `${path.dirname(__dirname)}/videos/input.mp4`,
  //     '-c:v ',
  //     'libxvid',
  //     `${path.dirname(__dirname)}/videos/output.avi`,
  //   ]);

  //   ffmpeg.stderr.on('data', data => {
  //     const buff = Buffer.from(data);
  //     const str = buff.toString('utf8');
  //     const Duration_matches = str.match(regex);
  //     const Current_matches = str.match(regex2);
  //     if (Duration_matches) {
  //       length = timeString2ms(Duration_matches[1]);
  //     }
  //     if (Current_matches) {
  //       currenttime = this.timeString2ms(Current_matches[1]);
  //     }
  //     if (length) {
  //       logger.log(Math.ceil((current / length) * 100) + "%");
  //     }
  //   });
  // }

  // timeString2ms(a, b, c) { // time(HH:MM:SS.mss)
  //   return c = 0,
  //     a = a.split('.'),
  //     !a[1] || (c += a[1] * 1),
  //     a = a[0].split(':'), b = a.length,
  //     c += (b == 3 ?
  //       a[0] * 3600 + a[1] * 60 + a[2] * 1 :
  //       b == 2 ? a[0] * 60 + a[1] * 1 : s = a[0] * 1) * 1e3,
  //     c;
  // }
}

export default new Ffmpeg()
