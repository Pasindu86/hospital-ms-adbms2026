# Database Change — Remove LAB_REPORT

This change removes the **Lab Report** feature from the Doctor page.
The `LAB_REPORT` table is no longer referenced anywhere in the application
(frontend `DoctorDashboard.jsx` and backend `server/routes/doctor.js` were
already updated). It is safe to drop.

## What to run

Run the statement below in SQL*Plus / SQL Developer connected as the `ADMIN`
schema owner.

```sql
-- Drop the LAB_REPORT table.
-- CASCADE CONSTRAINTS removes its own foreign key (FK_LR_DOCTOR -> DOCTOR)
-- and the CHK_LAB_STATUS check constraint automatically.
-- PURGE skips the recycle bin (optional).
DROP TABLE LAB_REPORT CASCADE CONSTRAINTS PURGE;
```

## Notes

- No other table has a foreign key **pointing to** `LAB_REPORT`, so dropping it
  does not break any other table. The only FK involved (`FK_LR_DOCTOR`) belongs
  to `LAB_REPORT` itself and is removed by `CASCADE CONSTRAINTS`.
- No PL/SQL package (`PKG_DOCTOR_OPS`, `PKG_ADMIN_OPS`) references `LAB_REPORT`,
  so nothing needs to be recompiled.
- If you keep `database/all_tables.sql` as the canonical schema script, also
  delete these sections from that file so a fresh rebuild does not recreate it:
  - the `CREATE TABLE "ADMIN"."LAB_REPORT" ...` block
  - `Constraints for Table LAB_REPORT` block (`CHK_LAB_STATUS`, primary key, etc.)
  - `Ref Constraints for Table LAB_REPORT` block (`FK_LR_DOCTOR`)

## Nothing needs to be ADDED

The **Patient History** view (treatment, clinical advice and prescribed
medicines) is fully served by existing tables — `MEDICAL_RECORD`,
`PRESCRIPTION` and `PRESCRIPTION_ITEM` — through the existing
`GET /api/doctor/patients/:id/history` endpoint. **No new tables, columns,
procedures or triggers are required.**
