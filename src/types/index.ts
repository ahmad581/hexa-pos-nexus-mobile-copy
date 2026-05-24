// Placeholder for type definitions
export interface IUser {
  id: string;
  name: string;
  email: string;
}

export interface IProduct {
  id: string;
  name: string;
  price: number;
  description?: string;
}

export interface IOrder {
  id: string;
  items: IProduct[];
  total: number;
  createdAt: Date;
}
