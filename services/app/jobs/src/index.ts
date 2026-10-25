// The Flisk Board jobs worker: claims one queued row from board_jobs a second and marks it done.
// `for update skip locked` means several workers can run without taking the same job.
import { SQL } from 'bun';

const url = process.env.DATABASE_URL;
if (!url) {
  // Without DATABASE_URL there is nothing to poll. The api marks jobs done itself after 3 seconds.
  // Stay alive so Flisk does not restart the worker in a loop.
  console.log('jobs: DATABASE_URL is not set, so this worker has nothing to poll');
  setInterval(() => {}, 1 << 30);
} else {
  const sql = new SQL(url);
  const tick = async () => {
    try {
      const rows = await sql`
        update board_jobs set status = 'done', processed_by = 'jobs', done_at = now()
        where id = (select id from board_jobs where status = 'queued' order by id limit 1 for update skip locked)
        returning id`;
      for (const row of rows) console.log(`jobs: processed job ${row.id}`);
    } catch (err) {
      // Usually the api has not created board_jobs yet. Try again next tick.
      console.log('jobs: waiting for board_jobs', String(err));
    }
  };
  console.log('jobs: polling board_jobs every second');
  setInterval(tick, 1000);
}
