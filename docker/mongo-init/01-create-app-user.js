const appDb = process.env.MONGO_DB || 'workpro';
const appUser = process.env.MONGO_APP_USER || 'workpro_app';
const appPassword = process.env.MONGO_APP_PASS || 'change-me';

const targetDb = db.getSiblingDB(appDb);

targetDb.createUser({
  user: appUser,
  pwd: appPassword,
  roles: [{ role: 'readWrite', db: appDb }],
});
