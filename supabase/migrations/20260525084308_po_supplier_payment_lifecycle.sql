-- Make PO lifecycle depend on both receiving progress and supplier payment progress.
-- A PO is only operationally complete when goods are fully received AND supplier payment is fully paid.

CREATE OR REPLACE FUNCTION public.recalculate_purchase_order_payment_term(p_term_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_amount NUMERIC(15,2);
  v_paid NUMERIC(15,2);
  v_due DATE;
BEGIN
  IF p_term_id IS NULL THEN
    RETURN;
  END IF;

  SELECT amount, due_date
  INTO v_amount, v_due
  FROM public.purchase_order_payment_terms
  WHERE id = p_term_id
    AND is_active = TRUE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_paid
  FROM public.vendor_payments
  WHERE payment_term_id = p_term_id
    AND status = 'posted';

  UPDATE public.purchase_order_payment_terms
  SET paid_amount = v_paid,
      status = CASE
        WHEN v_paid >= v_amount THEN 'paid'
        WHEN v_paid > 0 THEN 'partial'
        WHEN v_due < CURRENT_DATE THEN 'overdue'
        ELSE 'unpaid'
      END,
      updated_at = NOW()
  WHERE id = p_term_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_purchase_order_payment_term()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.recalculate_purchase_order_payment_term(NEW.payment_term_id);
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.recalculate_purchase_order_payment_term(OLD.payment_term_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_purchase_order_payment_term ON public.vendor_payments;
CREATE TRIGGER trg_sync_purchase_order_payment_term
AFTER INSERT OR UPDATE OR DELETE ON public.vendor_payments
FOR EACH ROW
EXECUTE FUNCTION public.sync_purchase_order_payment_term();

UPDATE public.purchase_order_payment_terms term
SET paid_amount = COALESCE(payment_stats.paid_amount, 0),
    status = CASE
      WHEN COALESCE(payment_stats.paid_amount, 0) >= term.amount THEN 'paid'
      WHEN COALESCE(payment_stats.paid_amount, 0) > 0 THEN 'partial'
      WHEN term.due_date < CURRENT_DATE THEN 'overdue'
      ELSE 'unpaid'
    END,
    updated_at = NOW()
FROM (
  SELECT payment_term_id, SUM(amount) AS paid_amount
  FROM public.vendor_payments
  WHERE status = 'posted'
    AND payment_term_id IS NOT NULL
  GROUP BY payment_term_id
) payment_stats
WHERE term.id = payment_stats.payment_term_id;

UPDATE public.purchase_order_payment_terms term
SET paid_amount = 0,
    status = CASE
      WHEN term.amount <= 0 THEN 'paid'
      WHEN term.due_date < CURRENT_DATE THEN 'overdue'
      ELSE 'unpaid'
    END,
    updated_at = NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM public.vendor_payments payment
  WHERE payment.payment_term_id = term.id
    AND payment.status = 'posted'
);

CREATE OR REPLACE VIEW public.v_purchase_order_payments AS
SELECT
  po.id AS purchase_order_id,
  po.nomor_po,
  po.supplier_id,
  s.nama_supplier,
  payable.payable_amount,
  COALESCE(term_stats.term_amount, 0) AS scheduled_amount,
  COALESCE(term_stats.paid_amount, 0) AS paid_amount,
  GREATEST(payable.payable_amount - COALESCE(term_stats.paid_amount, 0), 0) AS outstanding_amount,
  term_stats.next_due_date,
  CASE
    WHEN payable.payable_amount <= 0 THEN 'paid'
    WHEN COALESCE(term_stats.paid_amount, 0) >= payable.payable_amount THEN 'paid'
    WHEN COALESCE(term_stats.paid_amount, 0) > 0 THEN 'partial'
    WHEN term_stats.next_due_date IS NOT NULL AND term_stats.next_due_date < CURRENT_DATE THEN 'overdue'
    ELSE 'unpaid'
  END AS payment_status,
  COALESCE(term_stats.term_count, 0) AS term_count,
  CASE
    WHEN payable.payable_amount <= 0 THEN 100
    ELSE LEAST(100, ROUND((COALESCE(term_stats.paid_amount, 0)::numeric / payable.payable_amount::numeric) * 100, 2))
  END AS payment_progress_pct
FROM public.purchase_orders po
LEFT JOIN public.suppliers s ON s.id = po.supplier_id
CROSS JOIN LATERAL (
  SELECT COALESCE(NULLIF(po.total, 0), po.subtotal - COALESCE(po.diskon_nominal, 0) + COALESCE(po.ppn_nominal, 0), 0) AS payable_amount
) payable
LEFT JOIN (
  SELECT
    purchase_order_id,
    COUNT(*) AS term_count,
    SUM(amount) AS term_amount,
    SUM(paid_amount) AS paid_amount,
    MIN(due_date) FILTER (WHERE status IN ('unpaid', 'partial', 'overdue') AND is_active = TRUE) AS next_due_date
  FROM public.purchase_order_payment_terms
  WHERE is_active = TRUE
  GROUP BY purchase_order_id
) term_stats ON term_stats.purchase_order_id = po.id
WHERE po.is_active = TRUE;

CREATE OR REPLACE VIEW public.v_purchase_orders AS
SELECT
    po.*,
    production.nomor_produksi AS production_order_number,
    s.nama_supplier,
    s.kode AS supplier_kode,
    s.pic_name AS supplier_pic,
    s.email AS supplier_email,
    COALESCE(item_stats.total_items, 0) AS total_items,
    COALESCE(item_stats.total_items, 0) AS item_count,
    COALESCE(item_stats.total_qty, 0) AS total_qty,
    COALESCE(item_stats.total_qty, 0) AS total_qty_ordered,
    COALESCE(item_stats.received_qty, 0) AS total_qty_received,
    COALESCE(item_stats.total_value, 0) AS total_value,
    COALESCE(NULLIF(po.subtotal, 0), item_stats.total_value, 0) AS calculated_subtotal,
    COALESCE(
      NULLIF(po.ppn_nominal, 0),
      ROUND((COALESCE(NULLIF(po.subtotal, 0), item_stats.total_value, 0) - COALESCE(po.diskon_nominal, 0)) * COALESCE(po.ppn_persen, 0) / 100, 2),
      0
    ) AS calculated_ppn_nominal,
    payable.payable_amount AS grand_total,
    COALESCE(item_stats.received_items, 0) AS received_items,
    receive.receiving_progress_pct AS progress_pct,
    receive.receiving_progress_pct AS receive_percentage,
    receive.receiving_progress_pct AS received_percentage,
    COALESCE(payment.term_count, 0) AS payment_term_count,
    payable.payable_amount AS payable_amount,
    COALESCE(payment.paid_amount, 0) AS paid_amount,
    GREATEST(payable.payable_amount - COALESCE(payment.paid_amount, 0), 0) AS outstanding_amount,
    payment.next_due_date,
    CASE
      WHEN payable.payable_amount <= 0 THEN 100
      ELSE LEAST(100, ROUND((COALESCE(payment.paid_amount, 0)::numeric / payable.payable_amount::numeric) * 100, 2))
    END AS payment_progress_pct,
    CASE
      WHEN receive.receiving_progress_pct >= 100 THEN 'received'
      WHEN receive.receiving_progress_pct > 0 THEN 'partial'
      ELSE 'not_received'
    END AS receiving_status,
    CASE
      WHEN payable.payable_amount <= 0 THEN 'paid'
      WHEN COALESCE(payment.paid_amount, 0) >= payable.payable_amount THEN 'paid'
      WHEN COALESCE(payment.paid_amount, 0) > 0 THEN 'partial'
      WHEN payment.next_due_date IS NOT NULL AND payment.next_due_date < CURRENT_DATE THEN 'overdue'
      ELSE 'unpaid'
    END AS payment_status,
    CASE
      WHEN po.status = 'cancelled' THEN 'cancelled'
      WHEN po.status = 'draft' THEN 'draft'
      WHEN receive.receiving_progress_pct >= 100
        AND (payable.payable_amount <= 0 OR COALESCE(payment.paid_amount, 0) >= payable.payable_amount)
        THEN 'completed'
      WHEN receive.receiving_progress_pct >= 100 THEN 'waiting_payment'
      WHEN payable.payable_amount > 0 AND COALESCE(payment.paid_amount, 0) >= payable.payable_amount THEN 'waiting_receipt'
      ELSE 'in_progress'
    END AS lifecycle_status,
    ROUND((
      receive.receiving_progress_pct
      + CASE
          WHEN payable.payable_amount <= 0 THEN 100
          ELSE LEAST(100, ROUND((COALESCE(payment.paid_amount, 0)::numeric / payable.payable_amount::numeric) * 100, 2))
        END
    ) / 2, 2) AS overall_progress_pct
FROM public.purchase_orders po
LEFT JOIN public.production_orders production ON production.id = po.production_order_id
LEFT JOIN public.suppliers s ON s.id = po.supplier_id
LEFT JOIN (
    SELECT
        purchase_order_id,
        COUNT(*) AS total_items,
        COALESCE(SUM(qty_ordered), 0) AS total_qty,
        COALESCE(SUM(subtotal), 0) AS total_value,
        COALESCE(SUM(CASE WHEN qty_received >= qty_ordered THEN 1 ELSE 0 END), 0) AS received_items,
        COALESCE(SUM(qty_received), 0) AS received_qty
    FROM public.purchase_order_items
    WHERE is_active = TRUE
    GROUP BY purchase_order_id
) item_stats ON item_stats.purchase_order_id = po.id
CROSS JOIN LATERAL (
    SELECT CASE
        WHEN COALESCE(item_stats.total_qty, 0) = 0 THEN 0
        ELSE ROUND((COALESCE(item_stats.received_qty, 0)::numeric / item_stats.total_qty::numeric) * 100, 2)
    END AS receiving_progress_pct
) receive
CROSS JOIN LATERAL (
  SELECT COALESCE(
    NULLIF(po.total, 0),
    COALESCE(NULLIF(po.subtotal, 0), item_stats.total_value, 0)
      - COALESCE(po.diskon_nominal, 0)
      + COALESCE(NULLIF(po.ppn_nominal, 0), ROUND((COALESCE(NULLIF(po.subtotal, 0), item_stats.total_value, 0) - COALESCE(po.diskon_nominal, 0)) * COALESCE(po.ppn_persen, 0) / 100, 2), 0),
    0
  ) AS payable_amount
) payable
LEFT JOIN (
  SELECT
    purchase_order_id,
    COUNT(*) AS term_count,
    SUM(amount) AS scheduled_amount,
    SUM(paid_amount) AS paid_amount,
    MIN(due_date) FILTER (WHERE status IN ('unpaid', 'partial', 'overdue') AND is_active = TRUE) AS next_due_date
  FROM public.purchase_order_payment_terms
  WHERE is_active = TRUE
  GROUP BY purchase_order_id
) payment ON payment.purchase_order_id = po.id
WHERE po.is_active = TRUE;
