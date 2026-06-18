-- Add TOKEN_NUMBER column to PATIENT_DOCTOR_APPOINTMENT table
ALTER TABLE "ADMIN"."PATIENT_DOCTOR_APPOINTMENT" ADD (
  "TOKEN_NUMBER" NUMBER
);

-- Create a BEFORE INSERT trigger to auto-generate the token number per doctor per day
CREATE OR REPLACE EDITIONABLE TRIGGER "ADMIN"."TRG_APPOINTMENT_TOKEN"
BEFORE INSERT ON "ADMIN"."PATIENT_DOCTOR_APPOINTMENT"
FOR EACH ROW
DECLARE
    v_max_token NUMBER;
BEGIN
    -- Find the highest token number for the specific doctor on the specific date
    SELECT NVL(MAX("TOKEN_NUMBER"), 0) INTO v_max_token
    FROM "ADMIN"."PATIENT_DOCTOR_APPOINTMENT"
    WHERE "DOCTOR_ID" = :NEW."DOCTOR_ID"
      AND TRUNC("APPOINTMENT_DATE") = TRUNC(:NEW."APPOINTMENT_DATE");
    
    -- Assign the next token number
    :NEW."TOKEN_NUMBER" := v_max_token + 1;
END;
/
