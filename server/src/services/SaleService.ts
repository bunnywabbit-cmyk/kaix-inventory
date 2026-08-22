import { Prisma } from "../generated/prisma/client.js";

interface FinishedGoodContext {
  id: string;
  designId: string;
  designName: string;
  garmentStyle: string;
  color: string;
  size: string;
  unitPrice: number | null;
}

// Stock leaving a FinishedGood row — whether from the manual "Sell Stock"
// action or a print run's finish step recognizing the order was fulfilled
// from existing on-hand stock instead of a fresh print — is a sale either
// way, so both paths record it through this one function. Fields are
// snapshotted onto the Sale row (not just referenced by id) so historical
// revenue stays meaningful even if the FinishedGood or ShirtDesign is later
// edited or deleted — see the Sale model's comment in schema.prisma.
export async function recordFinishedGoodSale(
  tx: Prisma.TransactionClient,
  finishedGood: FinishedGoodContext,
  quantity: number,
) {
  if (quantity <= 0) return;

  await tx.sale.create({
    data: {
      finishedGoodId: finishedGood.id,
      designId: finishedGood.designId,
      designName: finishedGood.designName,
      garmentStyle: finishedGood.garmentStyle,
      color: finishedGood.color,
      size: finishedGood.size,
      quantity,
      unitPrice: finishedGood.unitPrice,
      totalPrice: finishedGood.unitPrice !== null ? finishedGood.unitPrice * quantity : null,
    },
  });
}
