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
  person_id?: number;
  user_id?: number;
  person_name?: string;
  user_name?: string;
  lead_id?: number;
  created_at?: string;
  updated_at?: string;
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

export interface ITempQuoteItem {
  id?: number;
  product_id: number;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  discount_percent: number;
  tax_percent: number;
  total: number;
}

export interface QuoteStore {
  quotes: IQuote[];
  total: number;
  loading: boolean;
  error: string | null;
  selectedQuote: IQuote | null;
  quoteItems: IQuoteItem[];
  fetchQuotes: (page?: number, limit?: number, search?: string) => Promise<void>;
  fetchQuoteById: (id: number) => Promise<IQuote | null>;
  addQuote: (data: any) => Promise<any>;
  updateQuote: (id: number, data: any) => Promise<any>;
  deleteQuote: (id: number) => Promise<void>;
  fetchQuoteItems: (quoteId: number) => Promise<void>;
  addQuoteItem: (quoteId: number, data: any) => Promise<any>;
  deleteQuoteItem: (itemId: number, quoteId: number) => Promise<void>;
  setSelectedQuote: (quote: IQuote | null) => void;
  clearError: () => void;
}
