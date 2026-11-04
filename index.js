// Composition root — assembles config, db, and app. The only file that "starts" things.
const config = require('./src/config');
const { connectDatabase } = require('./src/config/db');
const { createApp } = require('./src/app');

async function main() {
  await connectDatabase();
  const app = createApp();
  app.listen(config.port, () =>
    console.log(`🚌 Wayfinder running at http://localhost:${config.port}`)
  );
}

main();
