import ApprovalRequest from '@/models/ApprovalRequest';

interface PendingModificationMap {
    [targetId: string]: 'UPDATE' | 'DELETE';
}

/**
 * Fetches pending modifications (UPDATE/DELETE) for a list of items and returns a map.
 * @param model 'PRODUCT' | 'CATEGORY'
 * @param itemIds List of Item IDs to check
 */
export async function getPendingModifications(model: 'PRODUCT' | 'CATEGORY', itemIds: string[]): Promise<Map<string, 'UPDATE' | 'DELETE'>> {
    const validIds = itemIds.filter(id => id); // Filter out null/undefined
    if (validIds.length === 0) return new Map();

    const pendingRequests = await ApprovalRequest.find({
        model,
        status: 'PENDING',
        targetId: { $in: validIds },
        type: { $in: ['UPDATE', 'DELETE'] }
    }).select('targetId type').lean();

    const modificationMap = new Map<string, 'UPDATE' | 'DELETE'>();
    pendingRequests.forEach((req: any) => {
        if (req.targetId) {
            modificationMap.set(req.targetId.toString(), req.type);
        }
    });

    return modificationMap;
}

/**
 * Augments a list of items with pending modification status.
 * @param items List of products or categories
 * @param modificationMap Map from getPendingModifications
 */
export function augmentWithPendingStatus(items: any[], modificationMap: Map<string, 'UPDATE' | 'DELETE'>) {
    return items.map((item: any) => {
        const action = modificationMap.get(item._id.toString());
        if (action) {
            // Check if item is a Mongoose document or plain object
            const base = item.toObject ? item.toObject() : item;
            return { ...base, pendingAction: action, isPending: true };
        }
        return item;
    });
}


/**
 * Fetches pending and rejected CREATE requests for a model.
 * @param model 'PRODUCT' | 'CATEGORY'
 * @param role User role ('OWNER' | 'STAFF')
 */
export async function getGhostItems(model: 'PRODUCT' | 'CATEGORY', role: string) {
    // 1. Fetch Pending Creates (Visible to Everyone? Or just Staff? Actually Dashboard usually shows pending creates to everyone so they know it's coming, or maybe just Staff. Based on current logic: Everyone saw pending creates, but verified role for Rejected.)
    // Logic from previous implementation: Pending Creates were visible.
    
    const pendingCreates = await ApprovalRequest.find({
        type: 'CREATE',
        model,
        status: 'PENDING'
    }).sort({ requestDate: -1 }).lean();

    // 2. Fetch Rejected Creates (Visible ONLY to Staff)
    let rejectedCreates: any[] = [];
    if (role === 'STAFF') {
        rejectedCreates = await ApprovalRequest.find({
            type: 'CREATE',
            model,
            status: 'REJECTED'
        }).sort({ requestDate: -1 }).lean();
    }

    return { pendingCreates, rejectedCreates };
}

/**
 * Maps approval requests to the format expected by the UI (Product/Category interface).
 * @param requests List of ApprovalRequests
 * @param statusOverride Optional status override
 */
export function mapRequestsToItems(requests: any[], statusOverride: 'PENDING' | 'REJECTED') {
    return requests.map((req: any) => {
        const isRejected = statusOverride === 'REJECTED';
        return {
            ...req.data,
            _id: isRejected ? 'rejected_' + req._id : 'pending_' + req._id,
            requestId: req._id,
            status: statusOverride || req.status, // Preserve status if not overridden, though usually we pass explicit PENDING/REJECTED
            isPending: !isRejected,
            isRejected: isRejected,
            // For products, category might be an ID in data, so we mock populated field if needed
            // But UI handles checking categoryId or category object usually.
            // Let's keep it simple for now, generic.
            category: req.data.categoryId ? { _id: req.data.categoryId, name: 'Pending...' } : (req.data.category || null)
        };
    });
}
