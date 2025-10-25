# Role Migration Notes

The application now uses the following hierarchy of team roles:

- `general_manager` (General Manager / GM)
- `assistant_general_manager` (Assistant General Manager / AGM)
- `operations_manager` (Operational Manager / OM)
- `department_leader` (Department Leader / DL)
- `assistant_department_leader` (Assistant Department Leader / ADL)
- `area_leader` (Area Leader / AL)
- `team_leader` (Team Leader / TL)
- `team_member` (Team Member / TM)
- `technical_team_member` (Technical Team Member / TTL)

Legacy strings such as `admin`, `supervisor`, and `manager` continue to be accepted and are automatically normalized to the new equivalents during reads and writes. This ensures older data sets remain compatible while the UI presents the updated terminology.

## Updating existing data

1. Review any seed scripts or fixtures and replace `admin`, `supervisor`, and `manager` with `general_manager`, `assistant_general_manager`, and `operations_manager` respectively where appropriate.
2. Deploy both backend and frontend services so the new role labels and validation logic are available everywhere.
3. Ask users to sign out and sign back in if role-based permissions appear stale; cached sessions may need to be refreshed.
