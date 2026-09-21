export interface IQuote {
  id: number;
  subject: string;
  description?: string;
  discount_percent?: number;
  discount_amount?: number;
  tax_amount?: number;
  adjustment_amount?: number;
  sub_total?: number;
  grand_total?: number;
  expired_at?: string;
  person_id: number;
  user_id: number;
  person_name?: string;
  user_name?: string;
  lead_id?: number;
  created_at?: string;
  updated_at?: string;
  total_count?: number;
}

export interface IQuoteItem {
  id: number;
  quote_id: number;
  product_id: number;
  sku?: string;
  name?: string;
  quantity?: number;
  price?: number;
  discount_percent?: number;
  discount_amount?: number;
  tax_percent?: number;
  tax_amount?: number;
  total?: number;
}

export interface IQuoteCreateInput {
  subject: string;
  description?: string;
  person_id?: number;
  user_id?: number;
  discount_percent?: number;
  discount_amount?: number;
  tax_amount?: number;
  adjustment_amount?: number;
  sub_total?: number;
  grand_total?: number;
  expired_at?: string;
}

export interface IQuoteUpdateInput extends Partial<IQuoteCreateInput> {}
