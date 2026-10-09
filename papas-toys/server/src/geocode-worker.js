'use strict';

// Standalone geocoding drainer: run `npm run geocode` to process the whole
// pending queue once (useful as a cron job). The server also geocodes on upload
// and on a 60s timer, so this is optional.

const { processQueue } = require('./geocode');

(async () => {
  let total = { processed: 0, geocoded: 0, failed: 0 };
  // Keep going until nothing is left to do.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const summary = await processQueue({ limit: 25 });
    total.processed += summary.processed;
    total.geocoded += summary.geocoded;
    total.failed += summary.failed;
    // eslint-disable-next-line no-console
    console.log(
      `batch: +${summary.geocoded} geocoded, +${summary.failed} failed, ${summary.remaining} remaining`
    );
    if (summary.processed === 0 || summary.remaining === 0) break;
  }
  // eslint-disable-next-line no-console
  console.log('done:', total);
  process.exit(0);
})().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
