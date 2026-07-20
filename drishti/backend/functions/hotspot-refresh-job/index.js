/**
 * DRISHTI — hotspot-refresh-job
 * Basic I/O Catalyst Function, meant to be scheduled via Job Pool
 * (e.g. nightly at 2 AM) rather than deployed with an HTTP route.
 *
 * Recomputes the full hotspot grid (same logic as analytics-service's
 * /hotspots, minus filters) and stores it in Catalyst Cache under the key
 * "hotspots:all" so the dashboard's default map view is an instant cache
 * read instead of a full CaseMaster scan + aggregation on every page load.
 *
 * Schedule this in the console: Job Pool -> Create Job -> pick this
 * function -> set a cron-style recurring schedule.
 */

const catalyst = require('zcatalyst-sdk-node');

const GRID_SIZE = 0.01;
const CACHE_KEY = 'hotspots:all';
const CACHE_TTL_SECONDS = 24 * 60 * 60; // refreshed daily, so cache a bit past that

module.exports = async (context, basicIO) => {
  try {
    const catalystApp = catalyst.initialize(context);
    const zcql = catalystApp.zcql();
    const cache = catalystApp.cache();

    const rows = await zcql.executeZCQLQuery(
      `SELECT latitude, longitude FROM CaseMaster WHERE latitude IS NOT NULL`
    );

    const cells = {};
    for (const row of rows) {
      const c = row.CaseMaster;
      if (c.latitude == null || c.longitude == null) continue;

      const gridLat = Math.round(c.latitude / GRID_SIZE) * GRID_SIZE;
      const gridLng = Math.round(c.longitude / GRID_SIZE) * GRID_SIZE;
      const key = `${gridLat.toFixed(4)},${gridLng.toFixed(4)}`;

      if (!cells[key]) {
        cells[key] = { latitude: gridLat, longitude: gridLng, count: 0 };
      }
      cells[key].count += 1;
    }

    const segment = cache.segment();
    await segment.put(CACHE_KEY, JSON.stringify(Object.values(cells)), CACHE_TTL_SECONDS);

    console.log(`hotspot-refresh-job: cached ${Object.keys(cells).length} grid cells`);
  } catch (err) {
    console.error('hotspot-refresh-job failed:', err);
  } finally {
    context.close();
  }
};
