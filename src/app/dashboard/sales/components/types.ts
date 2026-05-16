export interface OrderItem {
    productId?: string;
    productName: string;
    quantity: number;
    price: number;
    sku?: string;
    category?: string;
    mrp?: number;
    costPrice?: number;
    availableQty?: number;
}

export interface Order {
    _id: string;
    orderId: string;
    customerName: string;
    mobileNumber: string;
    title: string;
    items: OrderItem[];
    discount: number;
    courierFees?: number;
    totalAmount: number;
    paymentMethod?: string;
    upiAmount?: number;
    cashAmount?: number;
    status?: string;
    type?: string;
    originalOrderId?: string;
    hasReturn?: boolean;
    returnType?: string;
    createdAt: string;
    createdBy?: string;
    balance?: number;
    isLedger?: boolean;
}

export interface Product {
    _id: string;
    name: string;
    sellingPrice: number;
    sku: string;
    category: { name: string };
    quantity: number;
    costPrice: number;
}
