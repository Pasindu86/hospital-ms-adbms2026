--------------------------------------------------------
--  Pharmacy Module SQL backup script
--  Contains: View, Function, Stored Procedure, and Trigger
--  Created: 2026-06-15
--------------------------------------------------------

--------------------------------------------------------
--  1. Oracle PL/SQL View: vw_low_stock_alert
--  Retrieves drugs from DRUG_STOCK where quantity is low
--------------------------------------------------------
CREATE OR REPLACE VIEW vw_low_stock_alert AS
SELECT 
    DRUG_ID, 
    DRUG_CODE, 
    DRUG_NAME, 
    QUANTITY, 
    MAX_STOCK
FROM 
    DRUG_STOCK
WHERE 
    QUANTITY < 15;
/

--------------------------------------------------------
--  2. Oracle PL/SQL Function: fn_stock_level
--  Evaluates stock status category based on drug ID
--------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_stock_level(
    p_drug_id IN NUMBER
) RETURN VARCHAR2 IS
    v_quantity NUMBER;
    v_status VARCHAR2(20);
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
--  3. Oracle PL/SQL Stored Procedure: sp_restock_medicine
--  Increases drug quantity capped at MAX_STOCK value
--------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_restock_medicine(
    p_drug_id IN NUMBER,
    p_amount  IN NUMBER
) IS
    v_max_stock NUMBER;
    v_curr_stock NUMBER;
BEGIN
    SELECT QUANTITY, MAX_STOCK 
    INTO v_curr_stock, v_max_stock
    FROM DRUG_STOCK 
    WHERE DRUG_ID = p_drug_id;

    -- Update quantity ensuring we do not exceed max stock capacity
    UPDATE DRUG_STOCK
    SET QUANTITY = LEAST(v_curr_stock + p_amount, v_max_stock)
    WHERE DRUG_ID = p_drug_id;

    COMMIT;
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END sp_restock_medicine;
/

--------------------------------------------------------
--  4. AFTER INSERT Trigger: trg_update_stock
--  Auto-decrements drug stock upon prescription item insertion
--------------------------------------------------------
CREATE OR REPLACE TRIGGER trg_update_stock
AFTER INSERT ON PRESCRIPTION_ITEM
FOR EACH ROW
DECLARE
    v_stock NUMBER;
BEGIN
    -- Get current stock level
    SELECT QUANTITY 
    INTO v_stock 
    FROM DRUG_STOCK 
    WHERE DRUG_ID = :NEW.DRUG_ID;

    IF v_stock <= 0 THEN
        RAISE_APPLICATION_ERROR(
            -20002,
            'Out of stock: Cannot insert prescription item for drug ID ' || :NEW.DRUG_ID
        );
    END IF;

    -- Decrement quantity
    UPDATE DRUG_STOCK
    SET QUANTITY = QUANTITY - 1
    WHERE DRUG_ID = :NEW.DRUG_ID;
END;
/
