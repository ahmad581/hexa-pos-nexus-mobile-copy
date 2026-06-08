export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  subcategory?: string | null;
  available: boolean;
  soldOut: boolean;
  display_order?: number;
  printerId?: string | null;
};

export type Category = {
  value: string;
  label: string;
  soldOut?: boolean;
  display_order?: number;
};

export type Subcategory = {
  id: string;
  value: string;
  label: string;
  category_value: string;
  is_sold_out?: boolean;
  display_order?: number;
};
