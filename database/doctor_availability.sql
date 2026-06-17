--------------------------------------------------------
--  Doctor Weekly Availability — PL/SQL Package
--  Created: 2026-06-17
--
--  Uses the EXISTING table DOCTOR_AVAILABILITY:
--     DOCTOR_ID    NUMBER
--     DAY_OF_WEEK  NUMBER        -- 1 = Monday ... 7 = Sunday (ISO)
--     START_TIME   VARCHAR2(5)   -- 'HH:MM' 24-hour, zero padded e.g. '09:00'
--     END_TIME     VARCHAR2(5)
--     PRIMARY KEY (DOCTOR_ID, DAY_OF_WEEK)
--
--  No new table or column is required.
--------------------------------------------------------

--------------------------------------------------------
--  Package Specification
--------------------------------------------------------
CREATE OR REPLACE PACKAGE "ADMIN"."PKG_DOCTOR_AVAILABILITY" AS

    -- Upsert (insert or update) one day's window for a doctor.
    PROCEDURE SET_DAY(
        p_doctor_id IN NUMBER,
        p_day       IN NUMBER,    -- 1=Mon .. 7=Sun
        p_start     IN VARCHAR2,  -- 'HH:MM'
        p_end       IN VARCHAR2   -- 'HH:MM'
    );

    -- Remove one day (doctor is off that day).
    PROCEDURE CLEAR_DAY(
        p_doctor_id IN NUMBER,
        p_day       IN NUMBER
    );

    -- Apply the same window to several days at once.
    -- p_days_csv: comma list of day numbers, e.g. '1,2,3,4,5'.
    -- When NULL or empty, applies to all 7 days.
    PROCEDURE SET_WEEKLY(
        p_doctor_id IN NUMBER,
        p_start     IN VARCHAR2,
        p_end       IN VARCHAR2,
        p_days_csv  IN VARCHAR2 DEFAULT NULL
    );

    -- Returns 1 if the appointment falls within the doctor's window
    -- for that weekday. Returns 1 when the doctor has NO schedule rows
    -- at all (undefined schedule = no restriction). Returns 0 otherwise.
    FUNCTION FN_IS_WITHIN_AVAILABILITY(
        p_doctor_id IN NUMBER,
        p_appt      IN TIMESTAMP
    ) RETURN NUMBER;

END PKG_DOCTOR_AVAILABILITY;
/

--------------------------------------------------------
--  Package Body
--------------------------------------------------------
CREATE OR REPLACE PACKAGE BODY "ADMIN"."PKG_DOCTOR_AVAILABILITY" AS

    -- NLS-independent weekday: 1=Mon .. 7=Sun.
    -- 1900-01-01 was a Monday, so MOD(days_since, 7) gives 0=Mon..6=Sun.
    FUNCTION ISO_DOW(p_d IN DATE) RETURN NUMBER IS
    BEGIN
        RETURN MOD(TRUNC(p_d) - DATE '1900-01-01', 7) + 1;
    END ISO_DOW;

    PROCEDURE SET_DAY(
        p_doctor_id IN NUMBER,
        p_day       IN NUMBER,
        p_start     IN VARCHAR2,
        p_end       IN VARCHAR2
    ) IS
    BEGIN
        IF p_day NOT BETWEEN 1 AND 7 THEN
            RAISE_APPLICATION_ERROR(-20020, 'Day of week must be 1 (Mon) to 7 (Sun)');
        END IF;
        IF p_start IS NULL OR p_end IS NULL THEN
            RAISE_APPLICATION_ERROR(-20021, 'Start and end time are required');
        END IF;
        IF p_end <= p_start THEN
            RAISE_APPLICATION_ERROR(-20022, 'End time must be after start time');
        END IF;

        MERGE INTO DOCTOR_AVAILABILITY d
        USING (SELECT p_doctor_id AS doctor_id, p_day AS day_of_week FROM dual) s
        ON (d.DOCTOR_ID = s.doctor_id AND d.DAY_OF_WEEK = s.day_of_week)
        WHEN MATCHED THEN
            UPDATE SET d.START_TIME = p_start, d.END_TIME = p_end
        WHEN NOT MATCHED THEN
            INSERT (DOCTOR_ID, DAY_OF_WEEK, START_TIME, END_TIME)
            VALUES (p_doctor_id, p_day, p_start, p_end);
    END SET_DAY;

    PROCEDURE CLEAR_DAY(
        p_doctor_id IN NUMBER,
        p_day       IN NUMBER
    ) IS
    BEGIN
        DELETE FROM DOCTOR_AVAILABILITY
        WHERE DOCTOR_ID = p_doctor_id AND DAY_OF_WEEK = p_day;
    END CLEAR_DAY;

    PROCEDURE SET_WEEKLY(
        p_doctor_id IN NUMBER,
        p_start     IN VARCHAR2,
        p_end       IN VARCHAR2,
        p_days_csv  IN VARCHAR2 DEFAULT NULL
    ) IS
        v_day NUMBER;
    BEGIN
        IF p_days_csv IS NULL OR LENGTH(TRIM(p_days_csv)) = 0 THEN
            FOR i IN 1 .. 7 LOOP
                SET_DAY(p_doctor_id, i, p_start, p_end);
            END LOOP;
        ELSE
            FOR rec IN (
                SELECT TO_NUMBER(TRIM(REGEXP_SUBSTR(p_days_csv, '[^,]+', 1, LEVEL))) AS dnum
                FROM dual
                CONNECT BY REGEXP_SUBSTR(p_days_csv, '[^,]+', 1, LEVEL) IS NOT NULL
            ) LOOP
                v_day := rec.dnum;
                IF v_day IS NOT NULL THEN
                    SET_DAY(p_doctor_id, v_day, p_start, p_end);
                END IF;
            END LOOP;
        END IF;
    END SET_WEEKLY;

    FUNCTION FN_IS_WITHIN_AVAILABILITY(
        p_doctor_id IN NUMBER,
        p_appt      IN TIMESTAMP
    ) RETURN NUMBER IS
        v_total NUMBER;
        v_match NUMBER;
        v_day   NUMBER;
        v_time  VARCHAR2(5);
    BEGIN
        SELECT COUNT(*) INTO v_total
        FROM DOCTOR_AVAILABILITY
        WHERE DOCTOR_ID = p_doctor_id;

        -- No schedule defined for this doctor -> do not restrict.
        IF v_total = 0 THEN
            RETURN 1;
        END IF;

        v_day  := ISO_DOW(CAST(p_appt AS DATE));
        v_time := TO_CHAR(p_appt, 'HH24:MI');

        SELECT COUNT(*) INTO v_match
        FROM DOCTOR_AVAILABILITY
        WHERE DOCTOR_ID = p_doctor_id
          AND DAY_OF_WEEK = v_day
          AND v_time >= START_TIME
          AND v_time <= END_TIME;

        RETURN CASE WHEN v_match > 0 THEN 1 ELSE 0 END;
    END FN_IS_WITHIN_AVAILABILITY;

END PKG_DOCTOR_AVAILABILITY;
/
