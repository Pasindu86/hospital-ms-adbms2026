--------------------------------------------------------
--  Remove automatic stock decrement on prescribing
--  Created: 2026-06-17
--
--  Problem:
--    Two AFTER INSERT triggers on PRESCRIPTION_ITEM both reduce
--    DRUG_STOCK.QUANTITY by 1 whenever a DOCTOR saves a prescription:
--       - TRG_DRUG_STOCK_DECREMENT   (all_table.sql / doctor_plsql.sql)
--       - TRG_UPDATE_STOCK           (04_inventory.sql)
--    This (a) double-counts and (b) wrongly drops stock at prescription
--    time instead of at pharmacy dispense/billing time.
--
--  Fix:
--    Drop both triggers. Stock is now reduced ONLY by the pharmacy
--    when it actually dispenses / bills (those endpoints run their own
--    explicit UPDATE DRUG_STOCK ... SET QUANTITY = QUANTITY - n).
--
--  Safe to run more than once (each drop is guarded).
--------------------------------------------------------

BEGIN
    EXECUTE IMMEDIATE 'DROP TRIGGER TRG_DRUG_STOCK_DECREMENT';
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE != -4080 THEN  -- ORA-04080: trigger does not exist
            RAISE;
        END IF;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'DROP TRIGGER TRG_UPDATE_STOCK';
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE != -4080 THEN
            RAISE;
        END IF;
END;
/
