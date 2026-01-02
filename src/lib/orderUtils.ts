import Order from '@/models/Order';

export const generateOrderId = async (prefix: string) => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  // Format: PREFIX-YYYY-MM-
  const idPrefix = `${prefix}-${year}-${month}-`;

  // Find latest order with this prefix
  const latestOrder = await Order.findOne({ 
    orderId: { $regex: `^${idPrefix}` } 
  }).sort({ createdAt: -1 });

  let nextSequence = 1;
  
  if (latestOrder && latestOrder.orderId) {
    const parts = latestOrder.orderId.split('-');
    // Expected format: PREFIX-YYYY-MM-XXXX
    // parts: [PREFIX, YYYY, MM, XXXX]
    const lastSeqStr = parts[parts.length - 1]; // Get the last part
    const lastSeq = parseInt(lastSeqStr, 10);
    
    if (!isNaN(lastSeq)) {
      nextSequence = lastSeq + 1;
    }
  }

  // Ensure at least 4 digits, but allow growth (e.g., 10000)
  const sequenceStr = String(nextSequence).padStart(4, '0');
  
  return `${idPrefix}${sequenceStr}`;
};
