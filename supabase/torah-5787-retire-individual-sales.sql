-- Cleanup after switching the 5787 Torah lectures to membership-only sales.
-- Applies ONLY to empty, dedicated 5787 shop tables. It does not touch Ko-fi
-- and will abort if any individual-purchase data has appeared.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.torah_5787_purchases LIMIT 1) THEN
    RAISE EXCEPTION 'Cannot remove purchase table: individual purchase records exist';
  END IF;
  IF EXISTS (SELECT 1 FROM public.torah_5787_shop_products LIMIT 1) THEN
    RAISE EXCEPTION 'Cannot remove mapping table: shop mappings exist';
  END IF;
END
$$;
DROP TABLE public.torah_5787_purchases;
DROP TABLE public.torah_5787_shop_products;
