const oracledb = require('oracledb');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function run() {
  let connection;
  try {
    const poolConfig = {
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING,
    };
    if (process.env.WALLET_DIR) {
      const walletPath = path.resolve(__dirname, '..', process.env.WALLET_DIR);
      process.env.TNS_ADMIN = walletPath;
      poolConfig.walletLocation = walletPath;
    }
    if (process.env.WALLET_PASSWORD) {
      poolConfig.walletPassword = process.env.WALLET_PASSWORD;
    }
    
    connection = await oracledb.getConnection(poolConfig);

    // 1. Alter DOCTOR table
    console.log('Altering DOCTOR table...');
    try {
        await connection.execute(`ALTER TABLE DOCTOR MODIFY DOCTOR_ID DROP IDENTITY`);
        console.log('Dropped identity from DOCTOR_ID');
    } catch (e) {
        if (e.errorNum === 30669 || e.errorNum === 904) {
            console.log('DOCTOR_ID identity already dropped or not an identity column.');
        } else {
            console.warn('Warning dropping identity:', e.message);
        }
    }

    try {
        await connection.execute(`ALTER TABLE DOCTOR ADD CONSTRAINT FK_DOCTOR_USER FOREIGN KEY (DOCTOR_ID) REFERENCES USER_AUTH(USER_ID)`);
        console.log('Added foreign key constraint FK_DOCTOR_USER');
    } catch (e) {
        if (e.errorNum === 2275) {
             console.log('Foreign key constraint already exists.');
        } else {
             console.warn('Warning adding constraint:', e.message);
        }
    }

    // 2. Create PL/SQL package for Admin Operations
    console.log('Creating PKG_ADMIN_OPS specification...');
    const pkgSpec = `
CREATE OR REPLACE PACKAGE "ADMIN"."PKG_ADMIN_OPS" AS
    PROCEDURE REGISTER_DOCTOR(
        p_staff_id       IN  VARCHAR2,
        p_full_name      IN  VARCHAR2,
        p_email          IN  VARCHAR2,
        p_password_hash  IN  VARCHAR2,
        p_license_number IN  VARCHAR2,
        p_address        IN  VARCHAR2,
        p_mobile_number  IN  VARCHAR2,
        p_specialist_area IN VARCHAR2,
        p_nurse_ids_csv  IN  VARCHAR2, -- Comma separated list of nurse IDs
        p_user_id        OUT NUMBER
    );
END PKG_ADMIN_OPS;
`;
    await connection.execute(pkgSpec);

    console.log('Creating PKG_ADMIN_OPS body...');
    const pkgBody = `
CREATE OR REPLACE PACKAGE BODY "ADMIN"."PKG_ADMIN_OPS" AS
    PROCEDURE REGISTER_DOCTOR(
        p_staff_id       IN  VARCHAR2,
        p_full_name      IN  VARCHAR2,
        p_email          IN  VARCHAR2,
        p_password_hash  IN  VARCHAR2,
        p_license_number IN  VARCHAR2,
        p_address        IN  VARCHAR2,
        p_mobile_number  IN  VARCHAR2,
        p_specialist_area IN VARCHAR2,
        p_nurse_ids_csv  IN  VARCHAR2,
        p_user_id        OUT NUMBER
    ) IS
        v_user_id NUMBER;
        v_nurse_id NUMBER;
        v_idx NUMBER := 1;
        v_comma_pos NUMBER;
        v_curr_pos NUMBER := 1;
        v_str_len NUMBER;
    BEGIN
        -- 1. Insert into USER_AUTH
        INSERT INTO USER_AUTH (STAFF_ID, FULL_NAME, EMAIL, PASSWORD_HASH, ROLE, IS_ACTIVE)
        VALUES (p_staff_id, p_full_name, p_email, p_password_hash, 'doctor', 1)
        RETURNING USER_ID INTO v_user_id;

        p_user_id := v_user_id;

        -- 2. Insert into DOCTOR
        INSERT INTO DOCTOR (DOCTOR_ID, NAME, EMAIL, LICENSE_NUMBER, ADDRESS, MOBILE_NUMBER, SPECIALIST_AREA)
        VALUES (v_user_id, p_full_name, p_email, p_license_number, p_address, p_mobile_number, p_specialist_area);

        -- 3. Parse CSV and Insert into DOCTOR_NURSE_ALLOCATION
        IF p_nurse_ids_csv IS NOT NULL AND LENGTH(p_nurse_ids_csv) > 0 THEN
            v_str_len := LENGTH(p_nurse_ids_csv);
            LOOP
                v_comma_pos := INSTR(p_nurse_ids_csv, ',', v_curr_pos);
                IF v_comma_pos = 0 THEN
                    v_nurse_id := TO_NUMBER(TRIM(SUBSTR(p_nurse_ids_csv, v_curr_pos)));
                    IF v_nurse_id IS NOT NULL THEN
                        INSERT INTO DOCTOR_NURSE_ALLOCATION (DOCTOR_ID, NURSE_ID, SHIFT_DETAILS)
                        VALUES (v_user_id, v_nurse_id, NULL);
                    END IF;
                    EXIT;
                ELSE
                    v_nurse_id := TO_NUMBER(TRIM(SUBSTR(p_nurse_ids_csv, v_curr_pos, v_comma_pos - v_curr_pos)));
                    IF v_nurse_id IS NOT NULL THEN
                        INSERT INTO DOCTOR_NURSE_ALLOCATION (DOCTOR_ID, NURSE_ID, SHIFT_DETAILS)
                        VALUES (v_user_id, v_nurse_id, NULL);
                    END IF;
                    v_curr_pos := v_comma_pos + 1;
                END IF;
            END LOOP;
        END IF;

        COMMIT;

    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE;
    END REGISTER_DOCTOR;
END PKG_ADMIN_OPS;
`;
    await connection.execute(pkgBody);
    console.log('Successfully created PKG_ADMIN_OPS package.');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

run();
