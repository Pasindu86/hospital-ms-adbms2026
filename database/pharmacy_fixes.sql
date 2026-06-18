--------------------------------------------------------
--  pharmacy_fixes.sql
--  Fixes 4 critical pharmacy-module bugs
--  Created: 2026-06-17
--
--  Bug 1: MAX_STOCK → CAPACITY in view, function, procedure
--  Bug 2: Drop duplicate trigger trg_update_stock;
--         keep only TRG_DRUG_STOCK_DECREMENT
--------------------------------------------------------

--------------------------------------------------------
--  FIX #2: Drop the DUPLICATE trigger trg_update_stock
--  (TRG_DRUG_STOCK_DECREMENT remains as the single source
--   of stock decrement on PRESCRIPTION_ITEM insert)
--------------------------------------------------------
BEGIN
    EXECUTE IMMEDIATE 'DROP TRIGGER TRG_UPDATE_STOCK';
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE != -4080 THEN   -- ORA-04080: trigger does not exist
            RAISE;
        END IF;
END;
/

--------------------------------------------------------
--  FIX #1a: Recreate vw_low_stock_alert using CAPACITY
--------------------------------------------------------
CREATE OR REPLACE VIEW vw_low_stock_alert AS
SELECT
    DRUG_ID,
    DRUG_CODE,
    DRUG_NAME,
    QUANTITY,
    CAPACITY
FROM
    DRUG_STOCK
WHERE
    QUANTITY < 15;
/

--------------------------------------------------------
--  FIX #1b: Recreate fn_stock_level (no MAX_STOCK ref,
--  already correct — included for completeness)
--------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_stock_level(
    p_drug_id IN NUMBER
) RETURN VARCHAR2 IS
    v_quantity NUMBER;
    v_status  VARCHAR2(20);
BEGIN
    SELECT QUANTITY
    INTO v_quantity
    FROM DRUG_STOCK
    WHERE DRUG_ID = p_drug_id;

    IF v_quantity = 0 THEN
        v_status := 'Out of Stock';
    ELSIF v_quantity < 15 THEN
        v_status := 'Critical';
    ELSIF v_quantity < 35 THEN
        v_status := 'Low Stock';
    ELSE
        v_status := 'Normal';
    END IF;

    RETURN v_status;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RETURN 'Unknown';
    WHEN OTHERS THEN
        RETURN 'Error';
END fn_stock_level;
/

--------------------------------------------------------
--  FIX #1c: Recreate sp_restock_medicine using CAPACITY
--------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_restock_medicine(
    p_drug_id IN NUMBER,
    p_amount  IN NUMBER
) IS
    v_capacity   NUMBER;
    v_curr_stock NUMBER;
BEGIN
    SELECT QUANTITY, CAPACITY
    INTO v_curr_stock, v_capacity
    FROM DRUG_STOCK
    WHERE DRUG_ID = p_drug_id;

    UPDATE DRUG_STOCK
    SET QUANTITY = LEAST(v_curr_stock + p_amount, v_capacity)
    WHERE DRUG_ID = p_drug_id;

    COMMIT;
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END sp_restock_medicine;
/
