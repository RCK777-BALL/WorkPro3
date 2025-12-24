# PM Procedure Templates API

This document describes the procedure template endpoints used to build PM procedures and publish versions.

## Authentication
All endpoints require authentication and a valid tenant context.

## Endpoints

### List procedure templates
`GET /pm/procedures`

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "templateId",
      "name": "Monthly lubrication",
      "description": "...",
      "category": "categoryId",
      "categoryName": "Safety",
      "latestPublishedVersion": "versionId",
      "latestVersionNumber": 2
    }
  ]
}
```

### Create procedure template
`POST /pm/procedures`

Payload:
```json
{
  "name": "Monthly lubrication",
  "description": "Optional description",
  "category": "categoryId"
}
```

### List versions
`GET /pm/procedures/:templateId/versions`

### Create version
`POST /pm/procedures/:templateId/versions`

Payload:
```json
{
  "durationMinutes": 30,
  "safetySteps": ["Lockout power"],
  "steps": ["Apply grease"],
  "notes": "Optional notes",
  "requiredParts": [{ "partId": "inventoryItemId", "quantity": 1 }],
  "requiredTools": [{ "toolName": "Grease gun", "quantity": 1 }]
}
```

### Publish version
`POST /pm/versions/:versionId/publish`

Publishing marks the version as `published` and updates the template's `latestPublishedVersion` reference.
