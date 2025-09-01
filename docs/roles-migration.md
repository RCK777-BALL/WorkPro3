# Role Migration Notes

The application now uses a unified set of roles:

- `admin`
- `manager`
- `technician`
- `viewer`

Previous role names such as `department_leader`, `area_leader`, `team_leader`, and `team_member` have been replaced.

## Updating existing data

1. Update all user and team member documents to use the new role names:
   - `department_leader` → `admin`
   - `area_leader` → `manager`
   - `team_leader` → `technician`
   - `team_member` → `viewer`
2. Ensure any seed scripts or fixtures are updated accordingly (see `Backend/scripts/seedTeam.ts`).
3. Redeploy backend and frontend so both services operate with the new role strings.

After migrating, users may need to log out and log back in to refresh cached role information.
