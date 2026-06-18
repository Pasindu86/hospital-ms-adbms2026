-- ============================================================
-- CarePulse Patient Portal - Schema Migration + PL/SQL Package
-- Run as ADMIN schema owner
-- ============================================================

-- 1. Link patients table to user_auth for self-service login
BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE patients ADD (user_id NUMBER)';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -1430 THEN RAISE; END IF; -- column already exists
END;
/

BEGIN
  EXECUTE IMMEDIATE '
    ALTER TABLE patients ADD CONSTRAINT fk_patients_user
    FOREIGN KEY (user_id) REFERENCES user_auth(user_id) ON DELETE CASCADE';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -2275 AND SQLCODE != -2261 THEN RAISE; END IF;
END;
/

-- 2. Patient portal PL/SQL package
CREATE OR REPLACE PACKAGE pkg_patient_portal AS

  PROCEDURE register_patient (
    p_full_name      IN  VARCHAR2,
    p_email          IN  VARCHAR2,
    p_password_hash  IN  VARCHAR2,
    p_phone_number   IN  VARCHAR2,
    p_address        IN  VARCHAR2,
    p_dob            IN  DATE,
    p_gender         IN  VARCHAR2,
    p_user_id        OUT NUMBER,
    p_patient_id     OUT NUMBER,
    p_staff_id       OUT VARCHAR2
  );

  PROCEDURE book_appointment (
    p_patient_id       IN  NUMBER,
    p_doctor_id        IN  NUMBER,
    p_appointment_date IN  TIMESTAMP,
    p_notes            IN  VARCHAR2,
    p_payment_method   IN  VARCHAR2,
    p_appointment_id   OUT NUMBER
  );

  PROCEDURE cancel_appointment (
    p_patient_id     IN NUMBER,
    p_appointment_id IN NUMBER
  );

  PROCEDURE update_appointment (
    p_patient_id       IN NUMBER,
    p_appointment_id   IN NUMBER,
    p_doctor_id        IN NUMBER,
    p_appointment_date IN TIMESTAMP,
    p_notes            IN VARCHAR2,
    p_payment_method   IN VARCHAR2
  );

  FUNCTION can_edit_appointment (
    p_appointment_date IN TIMESTAMP
  ) RETURN NUMBER;

END pkg_patient_portal;
/

CREATE OR REPLACE PACKAGE BODY pkg_patient_portal AS

  FUNCTION can_edit_appointment (
    p_appointment_date IN TIMESTAMP
  ) RETURN NUMBER IS
  BEGIN
    -- Returns 1 if appointment is more than 12 hours away, else 0
    IF p_appointment_date > SYSTIMESTAMP + INTERVAL '12' HOUR THEN
      RETURN 1;
    END IF;
    RETURN 0;
  END can_edit_appointment;

  PROCEDURE register_patient (
    p_full_name      IN  VARCHAR2,
    p_email          IN  VARCHAR2,
    p_password_hash  IN  VARCHAR2,
    p_phone_number   IN  VARCHAR2,
    p_address        IN  VARCHAR2,
    p_dob            IN  DATE,
    p_gender         IN  VARCHAR2,
    p_user_id        OUT NUMBER,
    p_patient_id     OUT NUMBER,
    p_staff_id       OUT VARCHAR2
  ) IS
    v_next_num NUMBER;
    v_staff_id VARCHAR2(10);
  BEGIN
    SELECT NVL(MAX(TO_NUMBER(REGEXP_REPLACE(staff_id, '[^0-9]', ''))), 0) + 1
    INTO v_next_num
    FROM user_auth
    WHERE role = 'patient';

    v_staff_id := 'PT' || LPAD(v_next_num, 3, '0');

    INSERT INTO user_auth (staff_id, full_name, email, password_hash, role, is_active)
    VALUES (v_staff_id, p_full_name, p_email, p_password_hash, 'patient', 1)
    RETURNING user_id INTO p_user_id;

    INSERT INTO patients (name, email, phone_number, address, date_of_birth, gender, user_id)
    VALUES (p_full_name, p_email, p_phone_number, p_address, p_dob, p_gender, p_user_id)
    RETURNING patient_id INTO p_patient_id;

    p_staff_id := v_staff_id;
  END register_patient;

  PROCEDURE book_appointment (
    p_patient_id       IN  NUMBER,
    p_doctor_id        IN  NUMBER,
    p_appointment_date IN  TIMESTAMP,
    p_notes            IN  VARCHAR2,
    p_payment_method   IN  VARCHAR2,
    p_appointment_id   OUT NUMBER
  ) IS
  BEGIN
    IF p_appointment_date <= SYSTIMESTAMP THEN
      RAISE_APPLICATION_ERROR(-20002, 'Appointment date must be in the future');
    END IF;

    INSERT INTO patient_doctor_appointment (
      patient_id, doctor_id, appointment_date, notes, status, payment_method, payment_status
    ) VALUES (
      p_patient_id, p_doctor_id, p_appointment_date, p_notes, 'Scheduled',
      NVL(p_payment_method, 'Cash'), 'Pending'
    ) RETURNING appointment_id INTO p_appointment_id;

    -- Link doctor to patient if not already linked
    BEGIN
      INSERT INTO doctor_patient (doctor_id, patient_id)
      VALUES (p_doctor_id, p_patient_id);
    EXCEPTION
      WHEN DUP_VAL_ON_INDEX THEN NULL;
    END;
  END book_appointment;

  PROCEDURE cancel_appointment (
    p_patient_id     IN NUMBER,
    p_appointment_id IN NUMBER
  ) IS
    v_status VARCHAR2(20);
  BEGIN
    SELECT status INTO v_status
    FROM patient_doctor_appointment
    WHERE appointment_id = p_appointment_id AND patient_id = p_patient_id;

    IF v_status = 'Completed' THEN
      RAISE_APPLICATION_ERROR(-20003, 'Cannot cancel a completed appointment');
    END IF;

    IF v_status = 'Cancelled' THEN
      RAISE_APPLICATION_ERROR(-20004, 'Appointment is already cancelled');
    END IF;

    UPDATE patient_doctor_appointment
    SET status = 'Cancelled'
    WHERE appointment_id = p_appointment_id AND patient_id = p_patient_id;
  END cancel_appointment;

  PROCEDURE update_appointment (
    p_patient_id       IN NUMBER,
    p_appointment_id   IN NUMBER,
    p_doctor_id        IN NUMBER,
    p_appointment_date IN TIMESTAMP,
    p_notes            IN VARCHAR2,
    p_payment_method   IN VARCHAR2
  ) IS
    v_current_date TIMESTAMP;
    v_status       VARCHAR2(20);
  BEGIN
    SELECT appointment_date, status
    INTO v_current_date, v_status
    FROM patient_doctor_appointment
    WHERE appointment_id = p_appointment_id AND patient_id = p_patient_id;

    IF v_status != 'Scheduled' THEN
      RAISE_APPLICATION_ERROR(-20005, 'Only scheduled appointments can be edited');
    END IF;

    IF can_edit_appointment(v_current_date) = 0 THEN
      RAISE_APPLICATION_ERROR(-20001,
        'Editing is allowed only when the appointment is more than 12 hours away');
    END IF;

    IF p_appointment_date <= SYSTIMESTAMP THEN
      RAISE_APPLICATION_ERROR(-20002, 'New appointment date must be in the future');
    END IF;

    UPDATE patient_doctor_appointment
    SET doctor_id        = p_doctor_id,
        appointment_date = p_appointment_date,
        notes            = p_notes,
        payment_method   = NVL(p_payment_method, payment_method)
    WHERE appointment_id = p_appointment_id AND patient_id = p_patient_id;

    BEGIN
      INSERT INTO doctor_patient (doctor_id, patient_id)
      VALUES (p_doctor_id, p_patient_id);
    EXCEPTION
      WHEN DUP_VAL_ON_INDEX THEN NULL;
    END;
  END update_appointment;

END pkg_patient_portal;
/
