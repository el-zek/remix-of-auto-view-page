CREATE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, business_name, business_type, legal_form, sector, region, size_category, employee_count, annual_turnover, does_import, does_export, tax_registrations, activities)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone'),
    NEW.raw_user_meta_data->>'business_name',
    NEW.raw_user_meta_data->>'business_type',
    NEW.raw_user_meta_data->>'legal_form',
    NEW.raw_user_meta_data->>'sector',
    NEW.raw_user_meta_data->>'region',
    COALESCE(NEW.raw_user_meta_data->>'size_category', 'Not set'),
    NULLIF(NEW.raw_user_meta_data->>'employee_count','')::integer,
    NULLIF(NEW.raw_user_meta_data->>'annual_turnover','')::numeric,
    COALESCE((NEW.raw_user_meta_data->>'does_import')::boolean, false),
    COALESCE((NEW.raw_user_meta_data->>'does_export')::boolean, false),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(COALESCE(NEW.raw_user_meta_data->'tax_registrations','[]'::jsonb))), '{}'),
    '{}'
  )
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE FUNCTION public.has_capability(_business_id uuid, _capability text) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
declare
  c public.business_characteristics;
  s public.business_subscription;
  eligible boolean := true;
  entitled boolean := true;
begin
  select * into c from public.business_characteristics where business_id = _business_id;
  if c.business_id is null then return true; end if;
  eligible := case _capability
    when 'inventory' then coalesce((c.flags->>'uses_inventory')::boolean, true)
    when 'products' then coalesce((c.flags->>'sells_products')::boolean, true)
    when 'pos' then coalesce((c.flags->>'uses_pos')::boolean, true)
    when 'credit_sales' then coalesce((c.flags->>'accepts_credit')::boolean, true)
    when 'purchasing' then coalesce((c.flags->>'has_suppliers')::boolean, true)
    when 'suppliers' then coalesce((c.flags->>'has_suppliers')::boolean, true)
    when 'customers' then coalesce((c.flags->>'has_customers')::boolean, true)
    when 'employees' then coalesce((c.flags->>'has_employees')::boolean, coalesce(c.employee_count, 0) > 0)
    when 'payroll' then coalesce((c.flags->>'runs_payroll')::boolean, true) and coalesce((c.flags->>'has_employees')::boolean, coalesce(c.employee_count, 0) > 0)
    when 'multi_warehouse' then coalesce((c.flags->>'multi_location')::boolean, false)
    when 'stock_transfers' then coalesce((c.flags->>'multi_location')::boolean, false)
    when 'tax_vat' then 'VAT' = any (c.tax_registrations)
    when 'tax_import_export' then c.does_import or c.does_export
    else true
  end;
  select * into s from public.business_subscription where business_id = _business_id;
  if s.business_id is not null then
    entitled := s.status in ('active', 'trialing')
      and (s.expires_at is null or s.expires_at > now())
      and (
        s.plan = 'full'
        or (s.plan = 'standard' and _capability not in ('advanced_analytics', 'multi_warehouse', 'stock_transfers'))
        or (s.plan = 'starter' and _capability in ('sales','pos','products','inventory','customers','finance','expenses','tax','compliance','reports','administration'))
      );
  end if;
  return eligible and entitled;
end; $$;
CREATE FUNCTION public.has_permission(_user_id uuid, _permission_key text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT (
    EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.role_permissions rp ON rp.role = ur.role WHERE ur.user_id = _user_id AND rp.permission_key = _permission_key)
    OR EXISTS (SELECT 1 FROM public.user_permission_overrides upo WHERE upo.user_id = _user_id AND upo.permission_key = _permission_key AND upo.effect = 'allow')
  ) AND NOT EXISTS (
    SELECT 1 FROM public.user_permission_overrides d WHERE d.user_id = _user_id AND d.permission_key = _permission_key AND d.effect = 'deny'
  );
$$;
CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
CREATE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_business_settings_updated BEFORE UPDATE ON public.business_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_campaign_results_updated BEFORE UPDATE ON public.campaign_results FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_campaign_share_plan_updated BEFORE UPDATE ON public.campaign_share_plan FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_capital_assets_updated BEFORE UPDATE ON public.capital_assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_compliance_evidence_updated BEFORE UPDATE ON public.compliance_evidence FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_compliance_licences_updated BEFORE UPDATE ON public.compliance_licences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_compliance_obligations_updated BEFORE UPDATE ON public.compliance_obligations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_compliance_rules_updated BEFORE UPDATE ON public.compliance_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_customer_channels_updated BEFORE UPDATE ON public.customer_channels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_customer_interactions_updated BEFORE UPDATE ON public.customer_interactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_employees_updated BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_expense_categories_updated BEFORE UPDATE ON public.expense_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_expenses_updated BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_finance_accounts_updated BEFORE UPDATE ON public.finance_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_finance_audit_logs_updated BEFORE UPDATE ON public.finance_audit_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_finance_payments_updated BEFORE UPDATE ON public.finance_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_finance_transfers_updated BEFORE UPDATE ON public.finance_transfers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_income_tax_records_updated BEFORE UPDATE ON public.income_tax_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_inventory_purchase_items_updated BEFORE UPDATE ON public.inventory_purchase_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_inventory_purchases_updated BEFORE UPDATE ON public.inventory_purchases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_market_audiences_updated BEFORE UPDATE ON public.market_audiences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_marketing_activities_updated BEFORE UPDATE ON public.marketing_activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_marketing_campaigns_updated BEFORE UPDATE ON public.marketing_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_marketing_reach_updated BEFORE UPDATE ON public.marketing_reach FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_paye_records_updated BEFORE UPDATE ON public.paye_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_product_categories_updated BEFORE UPDATE ON public.product_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_quotation_items_updated BEFORE UPDATE ON public.quotation_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_quotations_updated BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sale_items_updated BEFORE UPDATE ON public.sale_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sales_order_items_updated BEFORE UPDATE ON public.sales_order_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sales_orders_updated BEFORE UPDATE ON public.sales_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sales_payments_updated BEFORE UPDATE ON public.sales_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sales_return_items_updated BEFORE UPDATE ON public.sales_return_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sales_returns_updated BEFORE UPDATE ON public.sales_returns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sales_updated BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_stock_movements_updated BEFORE UPDATE ON public.stock_movements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_stock_transfers_updated BEFORE UPDATE ON public.stock_transfers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tax_documents_updated BEFORE UPDATE ON public.tax_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tax_expenses_updated BEFORE UPDATE ON public.tax_expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tax_imports_updated BEFORE UPDATE ON public.tax_imports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tax_purchases_updated BEFORE UPDATE ON public.tax_purchases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tax_sales_updated BEFORE UPDATE ON public.tax_sales FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tax_settings_updated BEFORE UPDATE ON public.tax_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_vat_returns_updated BEFORE UPDATE ON public.vat_returns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_warehouses_updated BEFORE UPDATE ON public.warehouses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_withholding_records_updated BEFORE UPDATE ON public.withholding_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();