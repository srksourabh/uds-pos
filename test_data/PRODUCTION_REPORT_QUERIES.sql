-- =====================================================
-- Production Report Queries for UDS-POS
-- These queries generate reports matching real client data formats
-- =====================================================

-- =====================================================
-- 1. FSE DETAILS REPORT
-- Matches: FSE Details.csv format
-- =====================================================

CREATE OR REPLACE VIEW v_fse_details_report AS
SELECT
    up.region AS "Region",
    up.metadata->>'emp_id' AS "Employee ID",
    up.full_name AS "Employee Full Name",
    CASE
        WHEN up.status = 'active' THEN 'Active'
        WHEN up.status = 'inactive' THEN 'Deactive'
        ELSE up.status::text
    END AS "Status",
    up.metadata->>'coordinator' AS "Coordinator Name",
    COALESCE(up.metadata->>'designation', 'Field Engineer') AS "Designation",
    up.phone AS "Mobile Number",
    up.metadata->>'alternate_phone' AS "Relative Mobile Number",
    up.email AS "Personal Email Address",
    up.metadata->>'address' AS "Address",
    up.metadata->>'locality' AS "Location",
    up.metadata->>'city' AS "City/District",
    up.metadata->>'state' AS "State",
    up.metadata->>'pin_code' AS "Pin",
    up.metadata->>'joining_date' AS "Joining Date",
    up.last_location_lat::text AS "Lat",
    up.last_location_lng::text AS "Long",
    up.metadata->>'coverage_areas' AS "Cover Loctaion/City/District"
FROM user_profiles up
WHERE up.role = 'engineer'
ORDER BY up.region, up.full_name;

-- Query to export as CSV
SELECT * FROM v_fse_details_report;

-- =====================================================
-- 2. PENDING CALLS REPORT
-- Matches: Pending Calls.xlsx format (key columns)
-- =====================================================

CREATE OR REPLACE VIEW v_pending_calls_report AS
SELECT
    'ULTIMATE DIGITAL SOLUTION' AS "FSP Center",
    'UDS-KOLKATA (R)' AS "FSP Region",
    c.metadata->>'fsp_sub_region' AS "FSP SubRegion",
    up.metadata->>'coordinator' AS "Alias Name",
    CASE
        WHEN c.type = 'install' THEN 'Installation'
        WHEN c.type = 'breakdown' THEN 'Break Down'
        WHEN c.type = 'maintenance' THEN COALESCE(c.metadata->>'call_type_original', 'Paper Roll')
        WHEN c.type = 'deinstall' THEN 'De-Installation'
        WHEN c.type = 'swap' THEN 'Asset Swap'
    END AS "Call Type",
    c.call_number AS "Call Ticket No",
    TO_CHAR(c.created_at, 'YYYY-MM-DD HH24:MI:SS') AS "Request Date",
    c.client_name AS "Merchant Name",
    'Retail' AS "ME Type",
    'Standard' AS "Grade",
    c.metadata->>'mid' AS "MID",
    c.metadata->>'tid' AS "TID",
    b.name AS "Institution",
    SUBSTRING(c.client_address FROM '[A-Z]{2,}(?=\s*\d{6})') AS "Location",
    SUBSTRING(c.client_address FROM '([A-Z][A-Za-z]+)\s*,\s*[A-Z]+\s+\d{6}') AS "City",
    CASE
        WHEN c.client_address ILIKE '%ODISHA%' THEN 'OD'
        WHEN c.client_address ILIKE '%WEST BENGAL%' THEN 'WB'
        WHEN c.client_address ILIKE '%ASSAM%' THEN 'AS'
        WHEN c.client_address ILIKE '%ARUNACHAL%' THEN 'AR'
        WHEN c.client_address ILIKE '%ANDAMAN%' THEN 'AN'
        WHEN c.client_address ILIKE '%JHARKHAND%' THEN 'JH'
        ELSE 'OD'
    END AS "StateCode",
    c.client_address AS "Contactaddress",
    SUBSTRING(c.client_address FROM '\d{6}') AS "ContactZip",
    c.client_contact AS "Contactname",
    c.client_phone AS "TelephoneNo",
    c.client_phone AS "MobileNo",
    CASE
        WHEN c.status = 'pending' THEN 'Pending for Activity'
        WHEN c.status = 'assigned' THEN 'Call Allocated'
        WHEN c.status = 'in_progress' THEN 'Work in Progress'
        ELSE c.status::text
    END AS "Status",
    c.metadata->>'sub_status' AS "Sub Status",
    COALESCE((c.metadata->>'visit_count')::integer, 0) AS "No Of Visit",
    EXTRACT(DAY FROM NOW() - c.created_at)::integer AS "Ageing",
    CASE
        WHEN EXTRACT(DAY FROM NOW() - c.created_at) <= 5 THEN '[<=5 Days]'
        WHEN EXTRACT(DAY FROM NOW() - c.created_at) <= 10 THEN '[>5 DAYS & <=10 DAYS]'
        WHEN EXTRACT(DAY FROM NOW() - c.created_at) <= 20 THEN '[>10 DAYS & <=20 DAYS]'
        WHEN EXTRACT(DAY FROM NOW() - c.created_at) <= 50 THEN '[>20 DAYS & <=50 DAYS]'
        ELSE '[>50 DAYS]'
    END AS "Ageing Band",
    c.metadata->>'old_model' AS "Old Model",
    c.metadata->>'device_model' AS "New Model",
    c.metadata->>'device_type' AS "Requested ConType",
    c.scheduled_date::text AS "Tentative Date",
    up.full_name AS "Allocated Engineer",
    (c.metadata->>'googled_distance')::numeric AS "GoolgedDistance"
FROM calls c
LEFT JOIN banks b ON c.client_bank = b.id
LEFT JOIN user_profiles up ON c.assigned_engineer = up.id
WHERE c.status IN ('pending', 'assigned', 'in_progress')
ORDER BY c.created_at DESC;

-- Query to export
SELECT * FROM v_pending_calls_report;

-- =====================================================
-- 3. CLOSED CALL DETAILS REPORT
-- Matches: Closed Call Details.csv format
-- =====================================================

CREATE OR REPLACE VIEW v_closed_calls_report AS
SELECT
    'UDS-KOLKATA (R)' AS "FSP Region",
    c.metadata->>'fsp_sub_region' AS "FSP Sub Region/Manager",
    up.metadata->>'coordinator' AS "Coordinator Name",
    'Tier 1' AS "Categorization",
    CASE
        WHEN c.type = 'install' THEN 'Installation'
        WHEN c.type = 'breakdown' THEN 'Break Down'
        WHEN c.type = 'maintenance' THEN 'Paper Roll'
        WHEN c.type = 'deinstall' THEN 'De-Installation'
        WHEN c.type = 'swap' THEN 'Asset Swap'
    END AS "Call Type",
    c.call_number AS "Call Ticket No",
    TO_CHAR(c.created_at, 'DD Mon YYYY HH24:MI') AS "Request Date",
    c.client_name AS "Merchant Name",
    '''' || c.metadata->>'mid' AS "MID",
    b.name AS "Customer name",
    SUBSTRING(c.client_address FROM '^[^,]+') AS "Location",
    SUBSTRING(c.client_address FROM '([A-Z][A-Za-z]+)\s*,') AS "City",
    CASE
        WHEN c.client_address ILIKE '%ODISHA%' THEN 'ODISHA'
        WHEN c.client_address ILIKE '%WEST BENGAL%' THEN 'WEST BENGAL'
        WHEN c.client_address ILIKE '%ASSAM%' THEN 'ASSAM'
        WHEN c.client_address ILIKE '%ARUNACHAL%' THEN 'ARUNACHAL PRADESH'
        ELSE 'ODISHA'
    END AS "State",
    c.client_phone AS "TelephoneNo",
    c.client_phone AS "MobileNo",
    c.client_address AS "Address1",
    SUBSTRING(c.client_address FROM '\d{6}') AS "Zip",
    '''' || c.metadata->>'tid' AS "TID",
    c.metadata->>'device_type' AS "Requested ConType",
    COALESCE((c.metadata->>'visit_count')::integer, 1) AS "No Of Visit",
    EXTRACT(DAY FROM c.completed_at - c.created_at)::integer AS "Ageing",
    EXTRACT(HOUR FROM c.completed_at - c.started_at)::integer AS "TAT",
    CASE
        WHEN EXTRACT(DAY FROM c.completed_at - c.created_at) <= 5 THEN '[<=5 Days]'
        WHEN EXTRACT(DAY FROM c.completed_at - c.created_at) <= 10 THEN '[>5 DAYS & <=10 DAYS]'
        ELSE '[>10 DAYS]'
    END AS "Ageing Band",
    '''' || c.metadata->>'new_serial' AS "New SerialNo",
    TO_CHAR(c.completed_at, 'DD Mon YYYY HH24:MI') AS "Closed Date",
    TO_CHAR(c.started_at, 'DD Mon YYYY HH24:MI') AS "Response Date",
    TO_CHAR(c.completed_at, 'DD Mon YYYY HH24:MI') AS "Resolution Date",
    TO_CHAR(c.updated_at, 'DD Mon YYYY HH24:MI') AS "Last Activity Date",
    TO_CHAR(c.completed_at, 'DD Mon YYYY HH24:MI') AS "Completed Date",
    '''' || c.metadata->>'sim_number' AS "Sim No",
    c.resolution_notes AS "Action Taken",
    '0 - 50 Kms' AS "Distance",
    (c.metadata->>'googled_distance')::numeric AS "Googled Distance",
    up.full_name AS "EngineerName",
    up.phone AS "Engineer MobileNo",
    c.latitude::text AS "Lat",
    c.longitude::text AS "Long",
    up.full_name AS "Closed By",
    ROUND(EXTRACT(EPOCH FROM c.completed_at - c.created_at) / 3600, 0)::integer AS "Ageing In Hrs",
    ROUND(EXTRACT(EPOCH FROM c.completed_at - c.started_at) / 3600, 0)::integer AS "TAT In Hrs",
    c.metadata->>'sim_model' AS "Existing Sim Model",
    '''' || c.metadata->>'sim_number' AS "Existing Sim SerialNo",
    c.metadata->>'sim_model' AS "New SIM Model",
    '''' || c.metadata->>'sim_number' AS "New SIMNo",
    COALESCE((c.metadata->>'rating')::integer, 0) AS "Rating"
FROM calls c
LEFT JOIN banks b ON c.client_bank = b.id
LEFT JOIN user_profiles up ON c.assigned_engineer = up.id
WHERE c.status = 'completed'
ORDER BY c.completed_at DESC;

-- Query to export
SELECT * FROM v_closed_calls_report;

-- =====================================================
-- 4. INVENTORY STOCK DETAILS REPORT
-- Matches: Inventory Stock Details Report.xls format
-- =====================================================

CREATE OR REPLACE VIEW v_inventory_stock_report AS
SELECT
    'ULTIMATE DIGITAL SOLUTION' AS "FSP Center",
    'UDS-KOLKATA (R)' AS "FSP Region",
    'FSP SubRegion' AS "User Type",
    d.current_location AS "User Name",
    d.metadata->>'brand' AS "Brand",
    COALESCE(d.metadata->>'part_category', 'Unit') AS "Part Category",
    d.model AS "Part No",
    d.model AS "Part Description",
    '''' || d.serial_number AS "Serialno",
    COALESCE((d.metadata->>'ageing')::integer,
             EXTRACT(DAY FROM NOW() - d.created_at)::integer) AS "Ageing",
    CASE
        WHEN COALESCE((d.metadata->>'ageing')::integer,
                      EXTRACT(DAY FROM NOW() - d.created_at)::integer) > 30 THEN '[>30 DAYS]'
        WHEN COALESCE((d.metadata->>'ageing')::integer,
                      EXTRACT(DAY FROM NOW() - d.created_at)::integer) > 20 THEN '[>20 DAYS & <=30 DAYS]'
        WHEN COALESCE((d.metadata->>'ageing')::integer,
                      EXTRACT(DAY FROM NOW() - d.created_at)::integer) > 10 THEN '[>10 DAYS & <=20 DAYS]'
        ELSE ' '
    END AS "Ageing Band",
    CASE
        WHEN d.status = 'faulty' THEN 'Defect'
        ELSE 'Good'
    END AS "Good Type",
    1 AS "Quantity",
    COALESCE(d.metadata->>'owner_type', 'Bank Center') AS "Owner Type",
    COALESCE(d.metadata->>'owner_name', b.name) AS "Owner Name",
    'Tier 1' AS "Categorization",
    d.metadata->>'purchase_date' AS "Purchase Date",
    d.metadata->>'invoice_number' AS "Invoice Number",
    d.metadata->>'asset_owner' AS "AssetOwner Identification",
    '' AS "SIM Bifurcation",
    up.full_name AS "EngineerName",
    up.phone AS "Eng MobileNo",
    '' AS "OEM Status",
    d.metadata->>'defective_reason' AS "Defective Reason"
FROM devices d
LEFT JOIN banks b ON d.device_bank = b.id
LEFT JOIN user_profiles up ON d.assigned_to = up.id
ORDER BY d.current_location, d.metadata->>'brand', d.model;

-- Query to export
SELECT * FROM v_inventory_stock_report;

-- =====================================================
-- 5. STOCK REPORT (Simplified)
-- Matches: Stock report.csv format
-- =====================================================

CREATE OR REPLACE VIEW v_stock_report AS
SELECT
    'UDS-KOLKATA (R)' AS "UDS",
    'FSP SubRegion' AS "FSP SubRegion",
    COALESCE(d.metadata->>'part_category', 'Unit') AS "Model Name",
    '''' || d.serial_number AS "Serialno",
    COALESCE((d.metadata->>'ageing')::integer,
             EXTRACT(DAY FROM NOW() - d.created_at)::integer) AS "Ageing",
    CASE
        WHEN COALESCE((d.metadata->>'ageing')::integer,
                      EXTRACT(DAY FROM NOW() - d.created_at)::integer) > 30 THEN '[>30 DAYS]'
        WHEN COALESCE((d.metadata->>'ageing')::integer,
                      EXTRACT(DAY FROM NOW() - d.created_at)::integer) > 20 THEN '[>20 DAYS & <=30 DAYS]'
        WHEN COALESCE((d.metadata->>'ageing')::integer,
                      EXTRACT(DAY FROM NOW() - d.created_at)::integer) > 10 THEN '[>10 DAYS & <=20 DAYS]'
        ELSE ' '
    END AS "Ageing Band",
    CASE
        WHEN d.status = 'faulty' THEN 'Defect'
        ELSE 'Good'
    END AS "Good Type",
    up.full_name AS "EngineerName",
    up.phone AS "Eng MobileNo",
    d.metadata->>'defective_reason' AS "Defective Reason",
    sm.metadata->>'transfer_method' AS "Transfer Details",
    sm.metadata->>'awb_no' AS "AWB no",
    CASE
        WHEN d.assigned_to IS NOT NULL THEN 'Delivered'
        ELSE 'Undelivered'
    END AS "Status",
    CASE
        WHEN d.assigned_to IS NOT NULL THEN 'Received'
        ELSE 'Not received'
    END AS "Engineer acceptance"
FROM devices d
LEFT JOIN user_profiles up ON d.assigned_to = up.id
LEFT JOIN LATERAL (
    SELECT metadata
    FROM stock_movements
    WHERE device_id = d.id
    ORDER BY created_at DESC
    LIMIT 1
) sm ON true
ORDER BY d.current_location, d.metadata->>'part_category';

-- Query to export
SELECT * FROM v_stock_report;

-- =====================================================
-- 6. MERCHANT DATABASE REPORT
-- Matches: Merchant Database.csv format
-- =====================================================

CREATE OR REPLACE VIEW v_merchant_database AS
SELECT DISTINCT
    '''' || c.metadata->>'mid' AS "MID",
    '''' || c.metadata->>'tid' AS "TID",
    c.client_name AS "Merchant Name",
    c.client_phone AS "TelephoneNo",
    c.client_phone AS "MobileNo",
    SUBSTRING(c.client_address FROM '^[^,]+') AS "Location",
    SUBSTRING(c.client_address FROM '([A-Z][A-Za-z]+)\s*,') AS "City",
    CASE
        WHEN c.client_address ILIKE '%ODISHA%' THEN 'ODISHA'
        WHEN c.client_address ILIKE '%WEST BENGAL%' THEN 'WEST BENGAL'
        WHEN c.client_address ILIKE '%ASSAM%' THEN 'ASSAM'
        WHEN c.client_address ILIKE '%ARUNACHAL%' THEN 'ARUNACHAL PRADESH'
        WHEN c.client_address ILIKE '%ANDAMAN%' THEN 'ANDAMAN AND NICOBAR'
        WHEN c.client_address ILIKE '%JHARKHAND%' THEN 'JHARKHAND'
        ELSE 'ODISHA'
    END AS "State",
    c.client_address AS "Address1",
    SUBSTRING(c.client_address FROM '\d{6}') AS "Zip",
    c.latitude::text AS "Lat",
    c.longitude::text AS "Long",
    '' AS "Geo Location"
FROM calls c
WHERE c.metadata->>'mid' IS NOT NULL
ORDER BY c.client_name;

-- Query to export
SELECT * FROM v_merchant_database;

-- =====================================================
-- 7. DASHBOARD SUMMARY QUERIES
-- Real-time statistics for admin dashboard
-- =====================================================

-- Overall call statistics by status
CREATE OR REPLACE VIEW v_call_summary AS
SELECT
    COUNT(*) FILTER (WHERE status = 'pending') AS pending_calls,
    COUNT(*) FILTER (WHERE status = 'assigned') AS assigned_calls,
    COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_calls,
    COUNT(*) FILTER (WHERE status = 'completed') AS completed_calls,
    COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_calls,
    COUNT(*) AS total_calls
FROM calls;

-- Call statistics by type
CREATE OR REPLACE VIEW v_call_by_type AS
SELECT
    CASE
        WHEN type = 'install' THEN 'Installation'
        WHEN type = 'breakdown' THEN 'Break Down'
        WHEN type = 'maintenance' THEN 'Paper Roll'
        WHEN type = 'deinstall' THEN 'De-Installation'
        WHEN type = 'swap' THEN 'Asset Swap'
    END AS call_type,
    COUNT(*) FILTER (WHERE status IN ('pending', 'assigned', 'in_progress')) AS open_calls,
    COUNT(*) FILTER (WHERE status = 'completed') AS completed_calls,
    COUNT(*) AS total_calls
FROM calls
GROUP BY type
ORDER BY total_calls DESC;

-- Engineer performance summary
CREATE OR REPLACE VIEW v_engineer_performance AS
SELECT
    up.full_name AS engineer_name,
    up.metadata->>'emp_id' AS emp_id,
    up.region,
    COUNT(c.id) FILTER (WHERE c.status = 'completed') AS completed_calls,
    COUNT(c.id) FILTER (WHERE c.status = 'in_progress') AS in_progress_calls,
    COUNT(c.id) FILTER (WHERE c.status IN ('pending', 'assigned')) AS pending_calls,
    AVG(EXTRACT(HOUR FROM c.completed_at - c.started_at))::numeric(10,2) AS avg_resolution_hours,
    COUNT(d.id) FILTER (WHERE d.status = 'issued') AS devices_assigned,
    COUNT(d.id) FILTER (WHERE d.status = 'faulty') AS faulty_devices
FROM user_profiles up
LEFT JOIN calls c ON c.assigned_engineer = up.id
LEFT JOIN devices d ON d.assigned_to = up.id
WHERE up.role = 'engineer'
GROUP BY up.id, up.full_name, up.metadata->>'emp_id', up.region
ORDER BY completed_calls DESC;

-- Device inventory summary by status
CREATE OR REPLACE VIEW v_device_summary AS
SELECT
    d.metadata->>'brand' AS brand,
    d.model,
    COUNT(*) FILTER (WHERE d.status = 'warehouse') AS in_warehouse,
    COUNT(*) FILTER (WHERE d.status = 'issued') AS issued_to_engineers,
    COUNT(*) FILTER (WHERE d.status = 'installed') AS installed,
    COUNT(*) FILTER (WHERE d.status = 'faulty') AS faulty,
    COUNT(*) AS total
FROM devices d
GROUP BY d.metadata->>'brand', d.model
ORDER BY brand, model;

-- Ageing analysis for pending calls
CREATE OR REPLACE VIEW v_call_ageing_analysis AS
SELECT
    CASE
        WHEN EXTRACT(DAY FROM NOW() - created_at) <= 5 THEN '[<=5 Days]'
        WHEN EXTRACT(DAY FROM NOW() - created_at) <= 10 THEN '[>5 DAYS & <=10 DAYS]'
        WHEN EXTRACT(DAY FROM NOW() - created_at) <= 20 THEN '[>10 DAYS & <=20 DAYS]'
        WHEN EXTRACT(DAY FROM NOW() - created_at) <= 50 THEN '[>20 DAYS & <=50 DAYS]'
        ELSE '[>50 DAYS]'
    END AS ageing_band,
    COUNT(*) AS call_count,
    COUNT(*) FILTER (WHERE type = 'install') AS installations,
    COUNT(*) FILTER (WHERE type = 'breakdown') AS breakdowns,
    COUNT(*) FILTER (WHERE type = 'maintenance') AS paper_rolls
FROM calls
WHERE status IN ('pending', 'assigned', 'in_progress')
GROUP BY
    CASE
        WHEN EXTRACT(DAY FROM NOW() - created_at) <= 5 THEN '[<=5 Days]'
        WHEN EXTRACT(DAY FROM NOW() - created_at) <= 10 THEN '[>5 DAYS & <=10 DAYS]'
        WHEN EXTRACT(DAY FROM NOW() - created_at) <= 20 THEN '[>10 DAYS & <=20 DAYS]'
        WHEN EXTRACT(DAY FROM NOW() - created_at) <= 50 THEN '[>20 DAYS & <=50 DAYS]'
        ELSE '[>50 DAYS]'
    END
ORDER BY
    CASE ageing_band
        WHEN '[<=5 Days]' THEN 1
        WHEN '[>5 DAYS & <=10 DAYS]' THEN 2
        WHEN '[>10 DAYS & <=20 DAYS]' THEN 3
        WHEN '[>20 DAYS & <=50 DAYS]' THEN 4
        ELSE 5
    END;

-- Region-wise call distribution
CREATE OR REPLACE VIEW v_region_summary AS
SELECT
    c.metadata->>'fsp_sub_region' AS region,
    COUNT(*) AS total_calls,
    COUNT(*) FILTER (WHERE c.status IN ('pending', 'assigned', 'in_progress')) AS open_calls,
    COUNT(*) FILTER (WHERE c.status = 'completed') AS completed_calls,
    COUNT(DISTINCT c.assigned_engineer) AS engineers_active
FROM calls c
WHERE c.metadata->>'fsp_sub_region' IS NOT NULL
GROUP BY c.metadata->>'fsp_sub_region'
ORDER BY total_calls DESC;

-- =====================================================
-- Usage Examples
-- =====================================================

-- Export FSE Details to CSV:
-- \COPY (SELECT * FROM v_fse_details_report) TO '/tmp/fse_details.csv' WITH CSV HEADER

-- Export Pending Calls:
-- \COPY (SELECT * FROM v_pending_calls_report) TO '/tmp/pending_calls.csv' WITH CSV HEADER

-- Export Closed Calls:
-- \COPY (SELECT * FROM v_closed_calls_report) TO '/tmp/closed_calls.csv' WITH CSV HEADER

-- Export Inventory:
-- \COPY (SELECT * FROM v_inventory_stock_report) TO '/tmp/inventory.csv' WITH CSV HEADER
