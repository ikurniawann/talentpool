-- Standardize Purchasing document numbers to PREFIX-YYYYMMDD-0001 for new rows only.
-- Existing document numbers are intentionally left unchanged.

CREATE OR REPLACE FUNCTION generate_return_number()
RETURNS TRIGGER AS $$
DECLARE
  date_part TEXT;
  sequence_number INTEGER;
  new_number TEXT;
BEGIN
  date_part := TO_CHAR(COALESCE(NEW.return_date, CURRENT_DATE), 'YYYYMMDD');

  SELECT COALESCE(MAX(CAST(SUBSTRING(return_number FROM '^RET-[0-9]{8}-([0-9]+)$') AS INTEGER)), 0) + 1
  INTO sequence_number
  FROM purchase_returns
  WHERE return_number LIKE 'RET-' || date_part || '-%';

  new_number := 'RET-' || date_part || '-' || LPAD(sequence_number::TEXT, 4, '0');
  NEW.return_number := new_number;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_return_number ON purchase_returns;
CREATE TRIGGER trg_generate_return_number
  BEFORE INSERT ON purchase_returns
  FOR EACH ROW
  WHEN (NEW.return_number IS NULL)
  EXECUTE FUNCTION generate_return_number();

CREATE OR REPLACE FUNCTION generate_legacy_return_number()
RETURNS TRIGGER AS $$
DECLARE
  date_part TEXT;
  sequence_number INTEGER;
  new_number TEXT;
BEGIN
  date_part := TO_CHAR(COALESCE(NEW.tanggal_pengembalian, CURRENT_DATE), 'YYYYMMDD');

  SELECT COALESCE(MAX(CAST(SUBSTRING(nomor_return FROM '^RET-[0-9]{8}-([0-9]+)$') AS INTEGER)), 0) + 1
  INTO sequence_number
  FROM returns
  WHERE nomor_return LIKE 'RET-' || date_part || '-%';

  new_number := 'RET-' || date_part || '-' || LPAD(sequence_number::TEXT, 4, '0');
  NEW.nomor_return := new_number;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_return_number ON returns;
CREATE TRIGGER trigger_generate_return_number
  BEFORE INSERT ON returns
  FOR EACH ROW
  WHEN (NEW.nomor_return IS NULL)
  EXECUTE FUNCTION generate_legacy_return_number();
