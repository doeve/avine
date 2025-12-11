import { execFile } from 'child_process';
import path from 'path';

const bin = path.join(process.cwd(), 'bin/fpcalc');
const file = 'test_audio/mix_2m44s.mp3';

execFile(bin, ['-json', '-raw', file], { maxBuffer: 1024 * 1024 * 10 }, (err, stdout) => {
  if (err) {
    console.error(err);
    return;
  }
  try {
    const res = JSON.parse(stdout);
    console.log('Duration:', res.duration);
    console.log('Fingerprint Type:', typeof res.fingerprint);
    if (Array.isArray(res.fingerprint)) {
        console.log('Fingerprint is Array. length:', res.fingerprint.length);
        console.log('First 10 items:', res.fingerprint.slice(0, 10));
    } else {
        console.log('Fingerprint is NOT Array:', res.fingerprint.substring(0, 50));
    }
  } catch (e) {
    console.error(e);
  }
});
