import bcrypt from "bcryptjs";

/**
 * Verifies that the hardcoded password matches the stored hash.
 *
 * Run with: ts-node Backend/scripts/verifyAdminHash.ts
 */
// Example bcrypt hash for the password "admin123"
const storedHash = "$2b$10$lbmUy86xKlj1/lR8TPPby.1/KfNmrRrgOgGs3u21jcd2SzCBRqDB.";
const password = "admin123";

(async () => {
  const match = await bcrypt.compare(password, storedHash);
  console.log(match);
})();
