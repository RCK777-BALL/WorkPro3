const appDb = process.env.MONGO_DB || process.env.MONGO_APP_DB || 'workpro';
const appUser = process.env.MONGO_APP_USER || 'workpro_app';
const appPassword = process.env.MONGO_APP_PASS || process.env.MONGO_APP_PASSWORD || 'change-me';

const targetDb = db.getSiblingDB(appDb);

targetDb.createUser({
  user: appUser,
  pwd: appPassword,
  roles: [{ role: 'readWrite', db: appDb }],
});
