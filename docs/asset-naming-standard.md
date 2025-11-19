# Asset Naming Standard

A consistent naming pattern keeps the asset library searchable and makes reports easier to scan. Use the following structure any
time a new asset is created—either manually or through imports:

```
<Manufacturer + Model> | <Short description> | <Station / install> | <Line> | <Department> | <Serial number> | <Plant or $> | <Date installed> | <Warranty details> | <Criticality> | <Asset type>
```

## Required content per segment

1. **Manufacturer + Model** – list every manufacturer / model pairing that applies to the equipment. Separate multiple pairings
   with semicolons (e.g., `Allen-Bradley 1756-L8; Keyence CV-X`).
2. **Short description** – a concise phrase so technicians immediately know what the asset does (e.g., "6-axis pick robot").
3. **Station / install** – the station identifier or installation area, matching the hierarchy that technicians see onsite.
4. **Line** – the production or assembly line the station belongs to.
5. **Department** – the responsible department so reporting can roll up correctly.
6. **Serial number** – the manufacturer serial number or asset tag; use `N/A` if the value is unknown when the record is created.
7. **Plant name or $ flag** – specify the plant/facility name. If your naming rules require a cost indicator, insert `$` or the
   agreed cost code here.
8. **Date installed** – use ISO format `YYYY-MM-DD` so sorting and imports remain reliable.
9. **Warranty details** – include "Warranty to <date>" or "Warranty expired" so technicians see coverage at a glance.
10. **Criticality** – use the standardized rating (High/Medium/Low or numeric) defined in your CMMS governance.
11. **Asset type** – the asset category shown in WorkPro (Robot, PLC, Conveyor, Compressor, etc.).

## Formatting tips

- Keep the delimiter consistent—`|` is preferred because it is easy to parse and rare in free text fields.
- Maintain the exact field order so filters, imports, and scripts can rely on a predictable pattern.
- Document approved criticality levels, asset types, and cost codes in your CMMS enablement guide so naming stays normalized.
- If a field does not apply, enter a clear placeholder (e.g., `N/A` or `Warranty not provided`) rather than leaving blank
  segments that make names hard to scan.
- When migrating historical assets, add temporary tags such as `Legacy` or `Needs Audit` after the asset type to flag records that
  should be revisited later.

## Examples

- `Siemens S7-1500 | Main line PLC | Station 12A | Line 3 | Packaging | SN12345 | Plant Alpha | 2023-04-18 | Warranty to 2026-04-18 | High | PLC`
- `FANUC M-20iD/25 | 6-axis pick robot | Station 4 | Line 1 | Assembly | SN98765 | $ | 2022-11-02 | Warranty expired | Medium | Robot`
- `Allen-Bradley 1756-L8; Keyence CV-X | Vision + control panel | Station 9B | Line 2 | Quality | SN45678 | Plant Beta | 2024-06-15 | Warranty to 2027-06-15 | High | Control Panel`
