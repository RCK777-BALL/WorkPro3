# How to test PM procedure templates

## backend API smoke test
1. Create a procedure template:
   ```bash
   curl -X POST "$API_URL/pm/procedures" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name":"Monthly lubrication","description":"Check oil"}'
   ```
2. Create a draft version:
   ```bash
   curl -X POST "$API_URL/pm/procedures/<templateId>/versions" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"durationMinutes":30,"safetySteps":["Lock out power"],"steps":["Apply grease"]}'
   ```
3. Publish the version:
   ```bash
   curl -X POST "$API_URL/pm/versions/<versionId>/publish" \
     -H "Authorization: Bearer $TOKEN"
   ```

## Scheduler integration
1. Ensure a PM task references the procedure template.
2. Run the PM scheduler job and confirm generated work orders include:
   - `procedureTemplateId`
   - `procedureTemplateVersionId`
   - checklist items seeded from the published version.

## frontend UI
1. Navigate to **PM → Procedures**.
2. Create a template and draft version; publish it.
3. Navigate to **PM → Tasks** and attach the procedure to an assignment.
4. Generate a work order and verify checklist execution is available on the work order detail page.
