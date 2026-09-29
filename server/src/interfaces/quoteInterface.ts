export interface IQuoteAddress {
  country?: string;
  state?: string;
  city?: string;
  postcode?: string;
  street_address?: string;
  address?: string;
}

export interface IQuote {
  id: number;
  subject: string;
  description?: string;
  billing_address?: IQuoteAddress;
  shipping_address?: IQuoteAddress;
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
  items?: IQuoteItem[];
}

export interface IQuoteItem {
  id?: number;
  quote_id?: number;
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
  billing_address?: IQuoteAddress;
  shipping_address?: IQuoteAddress;
  person_id?: number;
  user_id?: number;
  lead_id?: number;
  discount_percent?: number;
  discount_amount?: number;
  tax_amount?: number;
  adjustment_amount?: number;
  sub_total?: number;
  grand_total?: number;
  expired_at?: string;
  items?: IQuoteItem[];
}

export interface IQuoteUpdateInput extends Partial<IQuoteCreateInput> {}
