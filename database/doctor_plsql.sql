--------------------------------------------------------
--  Doctor Workflow — PL/SQL Package & Trigger
--  Created: 2026-06-14
--------------------------------------------------------

--------------------------------------------------------
--  Package Specification: PKG_DOCTOR_OPS
--------------------------------------------------------

CREATE OR REPLACE PACKAGE "ADMIN"."PKG_DOCTOR_OPS" AS

    /**
     * SAVE_TREATMENT
     * Inserts a new medical record for a completed examination
     * and marks the appointment status as 'Completed'.
     */
    PROCEDURE SAVE_TREATMENT(
        p_appointment_id  IN  NUMBER,
        p_patient_id      IN  NUMBER,
        p_doctor_id       IN  NUMBER,
        p_diagnosis       IN  VARCHAR2,
        p_clinical_advice IN  CLOB,
        p_treatment_notes IN  VARCHAR2,
        p_record_id       OUT NUMBER
    );

    /**
     * GET_PATIENT_HISTORY
     * Returns a REF CURSOR of all past medical records
     * for the given patient, ordered by most recent first.
     */
    FUNCTION GET_PATIENT_HISTORY(p_patient_id IN NUMBER)
        RETURN SYS_REFCURSOR;

END PKG_DOCTOR_OPS;
/

--------------------------------------------------------
--  Package Body: PKG_DOCTOR_OPS
--------------------------------------------------------

CREATE OR REPLACE PACKAGE BODY "ADMIN"."PKG_DOCTOR_OPS" AS

    PROCEDURE SAVE_TREATMENT(
        p_appointment_id  IN  NUMBER,
        p_patient_id      IN  NUMBER,
        p_doctor_id       IN  NUMBER,
        p_diagnosis       IN  VARCHAR2,
        p_clinical_advice IN  CLOB,
        p_treatment_notes IN  VARCHAR2,
        p_record_id       OUT NUMBER
    ) IS
    BEGIN
        -- Insert a new medical record
        INSERT INTO MEDICAL_RECORD (
            APPOINTMENT_ID, PATIENT_ID, DOCTOR_ID,
            DIAGNOSIS, CLINICAL_ADVICE, TREATMENT_NOTES
        ) VALUES (
            p_appointment_id, p_patient_id, p_doctor_id,
            p_diagnosis, p_clinical_advice, p_treatment_notes
        ) RETURNING RECORD_ID INTO p_record_id;

        -- Mark the appointment as completed
        UPDATE PATIENT_DOCTOR_APPOINTMENT
        SET STATUS = 'Completed'
        WHERE APPOINTMENT_ID = p_appointment_id;

        COMMIT;

    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE;
    END SAVE_TREATMENT;

    FUNCTION GET_PATIENT_HISTORY(p_patient_id IN NUMBER)
        RETURN SYS_REFCURSOR
    IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR
            SELECT
                mr.RECORD_ID,
                mr.APPOINTMENT_ID,
                mr.DIAGNOSIS,
                mr.CLINICAL_ADVICE,
                mr.TREATMENT_NOTES,
                mr.RECORD_DATE,
                d.NAME       AS DOCTOR_NAME,
                d.SPECIALIST_AREA
            FROM MEDICAL_RECORD mr
            JOIN DOCTOR d ON mr.DOCTOR_ID = d.DOCTOR_ID
            WHERE mr.PATIENT_ID = p_patient_id
            ORDER BY mr.RECORD_DATE DESC;

        RETURN v_cursor;
    END GET_PATIENT_HISTORY;

END PKG_DOCTOR_OPS;
/

--------------------------------------------------------
--  Trigger: TRG_DRUG_STOCK_DECREMENT
--  Auto-decrements drug quantity when a prescription
--  item is inserted. Raises error if out of stock.
--------------------------------------------------------

CREATE OR REPLACE TRIGGER "ADMIN"."TRG_DRUG_STOCK_DECREMENT"
AFTER INSERT ON "ADMIN"."PRESCRIPTION_ITEM"
FOR EACH ROW
BEGIN
    UPDATE DRUG_STOCK
    SET QUANTITY = QUANTITY - 1
    WHERE DRUG_ID = :NEW.DRUG_ID
      AND QUANTITY > 0;

    IF SQL%ROWCOUNT = 0 THEN
        RAISE_APPLICATION_ERROR(
            -20001,
            'Drug out of stock: DRUG_ID = ' || :NEW.DRUG_ID
        );
    END IF;
END;
/
