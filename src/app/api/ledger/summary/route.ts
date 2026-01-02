import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Ledger from '@/models/Ledger';

export async function GET(req: Request) {
  try {
    await dbConnect();
    
    // Aggregate by partyName
    // Filter by status: 'PENDING' ONLY to show current outstanding
    // If we want total history, we would remove the match status, but usually "Receivable/Payable" implies pending.
    // The user asked for "view which will show recievable and payable on the basis of user".
    // I'll show Net Pending Balance.

    const summary = await Ledger.aggregate([
      { $match: { status: 'PENDING' } }, // Only pending transactions contribute to "To Receive/Pay"
      {
        $group: {
          _id: "$partyName",
          totalReceivable: {
            $sum: {
              $cond: [{ $eq: ["$type", "RECEIVABLE"] }, "$amount", 0]
            }
          },
          totalPayable: {
            $sum: {
              $cond: [{ $eq: ["$type", "PAYABLE"] }, "$amount", 0]
            }
          }
        }
      },
      {
        $project: {
          partyName: "$_id",
          totalReceivable: 1,
          totalPayable: 1,
          netBalance: { $subtract: ["$totalReceivable", "$totalPayable"] },
          _id: 0
        }
      },
      { $sort: { partyName: 1 } }
    ]);

    return NextResponse.json({ success: true, data: summary });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
