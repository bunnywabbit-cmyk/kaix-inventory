import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";

// Upserted by email — safe to run repeatedly, and independent of the demo
// data reset below (the User table is never touched by the deleteMany calls).
async function ensureAdminUser() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const pin = process.env.ADMIN_PIN?.trim();

  if (!email || !password) {
    console.warn("ADMIN_EMAIL/ADMIN_PASSWORD not set in server/.env — skipping admin user creation.");
    return;
  }

  if (pin && !/^\d{6}$/.test(pin)) {
    console.warn("ADMIN_PIN must be exactly 6 digits — skipping PIN setup for the admin account.");
  }
  const validPin = pin && /^\d{6}$/.test(pin) ? pin : undefined;

  const passwordHash = await bcrypt.hash(password, 10);
  const pinHash = validPin ? await bcrypt.hash(validPin, 10) : undefined;

  await prisma.user.upsert({
    where: { email },
    // Re-running the seed backfills a PIN onto an existing admin account if
    // one is now set in .env, without touching the password on every run.
    update: pinHash ? { pinHash } : {},
    create: { email, passwordHash, role: "ADMIN", pinHash },
  });
  console.log(`Admin user ensured: ${email}${pinHash ? " (PIN login enabled)" : ""}`);
}

async function main() {
  await ensureAdminUser();

  // Reset in FK-safe order so this script is idempotent across re-runs.
  await prisma.finishedGood.deleteMany();
  await prisma.physicalScreen.deleteMany();
  await prisma.designColorway.deleteMany();
  await prisma.shirtDesign.deleteMany();
  await prisma.rawMaterial.deleteMany();
  await prisma.category.deleteMany();

  const [blankApparel, plastisolInks, waterBasedInks, packaging, tapesAndChemicals] =
    await Promise.all([
      prisma.category.create({
        data: { name: "Blank Apparel", description: "Undecorated garments awaiting print." },
      }),
      prisma.category.create({
        data: { name: "Plastisol Inks", description: "Standard plastisol screen printing inks." },
      }),
      prisma.category.create({
        data: { name: "Water-Based Inks", description: "Water-based and discharge inks." },
      }),
      prisma.category.create({
        data: { name: "Packaging & Boxes", description: "Mailers, boxes, and shipping supplies." },
      }),
      prisma.category.create({
        data: {
          name: "Screen Tapes & Chemicals",
          description: "Blockout tape, emulsion, reclaim chemicals.",
        },
      }),
    ]);

  await prisma.rawMaterial.createMany({
    data: [
      {
        name: "Gildan 5000 Blank Tee",
        sku: "GIL5000-BLK-L",
        quantity: 84,
        reorderLevel: 60,
        brand: "Gildan",
        styleNumber: "5000",
        color: "Black",
        size: "L",
        unit: "pieces",
        categoryId: blankApparel.id,
      },
      {
        name: "Gildan 5000 Blank Tee",
        sku: "GIL5000-WHT-M",
        quantity: 120,
        reorderLevel: 60,
        brand: "Gildan",
        styleNumber: "5000",
        color: "White",
        size: "M",
        unit: "pieces",
        categoryId: blankApparel.id,
      },
      {
        name: "Bella+Canvas 3001 Blank Tee",
        sku: "BEL3001-NVY-S",
        quantity: 45,
        reorderLevel: 40,
        brand: "Bella+Canvas",
        styleNumber: "3001",
        color: "Navy",
        size: "S",
        unit: "pieces",
        categoryId: blankApparel.id,
      },
      {
        name: "Wilflex White Plastisol Ink",
        sku: "WLF-WHT-QT",
        quantity: 8,
        reorderLevel: 6,
        brand: "Wilflex",
        color: "White",
        unit: "quarts",
        categoryId: plastisolInks.id,
      },
      {
        name: "Union Black Plastisol Ink",
        sku: "UNI-BLK-QT",
        quantity: 4,
        reorderLevel: 6,
        brand: "Union",
        color: "Black",
        unit: "quarts",
        categoryId: plastisolInks.id,
      },
      {
        name: "Triangle Water-Based White Ink",
        sku: "TRI-WB-WHT-GAL",
        quantity: 2,
        reorderLevel: 3,
        brand: "Triangle",
        color: "White",
        unit: "gallons",
        categoryId: waterBasedInks.id,
      },
      {
        name: "Poly Mailer Bag",
        sku: "POLY-BAG-10x13",
        quantity: 340,
        reorderLevel: 250,
        size: "10x13 in",
        unit: "pieces",
        categoryId: packaging.id,
      },
      {
        name: "Kraft Shipping Box",
        sku: "BOX-KRFT-MD",
        quantity: 58,
        reorderLevel: 50,
        size: "Medium",
        unit: "pieces",
        categoryId: packaging.id,
      },
      {
        name: "Screen Blockout Tape",
        sku: "TAPE-SCRN-2IN",
        quantity: 16,
        reorderLevel: 15,
        size: "2 in",
        unit: "rolls",
        categoryId: tapesAndChemicals.id,
      },
    ],
  });

  const kaixLogoTee = await prisma.shirtDesign.create({
    data: {
      designName: "Kaix Logo Tee",
      printType: "SILKSCREEN",
      mainProductImage: "https://placehold.co/600x600/1e293b/f59e0b?text=Kaix+Logo+Tee",
      availableFits: ["Oversized", "Boxy"],
      colorways: {
        create: [
          {
            colorwayName: "Black Shirt / White Ink",
            imageUrl: "https://placehold.co/600x600/0f172a/ffffff?text=Black+%2F+White",
          },
          {
            colorwayName: "Navy Shirt / Gold Ink",
            imageUrl: "https://placehold.co/600x600/1e3a5f/f59e0b?text=Navy+%2F+Gold",
          },
        ],
      },
    },
    include: { colorways: true },
  });

  const dtfSamplePack = await prisma.shirtDesign.create({
    data: {
      designName: "Kaix Custom DTF Sample Pack",
      printType: "DTF",
      mainProductImage: "https://placehold.co/600x600/1e293b/38bdf8?text=DTF+Sample+Pack",
      availableFits: ["Oversized"],
      colorways: {
        create: [
          {
            colorwayName: "Heather Grey Shirt / Full Color",
            imageUrl: "https://placehold.co/600x600/6b7280/ffffff?text=Heather+Grey",
          },
        ],
      },
    },
    include: { colorways: true },
  });

  const downtownBrewing = await prisma.shirtDesign.create({
    data: {
      designName: "Downtown Brewing Co. Staff Tee",
      printType: "SILKSCREEN",
      mainProductImage: "https://placehold.co/600x600/1e293b/eab308?text=Downtown+Brewing",
      availableFits: ["Boxy"],
      colorways: {
        create: [
          {
            colorwayName: "Black Shirt / White Ink",
            imageUrl: "https://placehold.co/600x600/0f172a/ffffff?text=Black+%2F+White",
          },
          {
            colorwayName: "Charcoal Shirt / White Ink",
            imageUrl: "https://placehold.co/600x600/36454f/ffffff?text=Charcoal+%2F+White",
          },
        ],
      },
    },
    include: { colorways: true },
  });

  await prisma.physicalScreen.createMany({
    data: [
      {
        screenNumber: "Screen #101",
        meshCount: 110,
        frameType: "ALUMINUM",
        frameSize: "20x24",
        status: "CLEAN_RECLAIMED",
      },
      {
        screenNumber: "Screen #102",
        meshCount: 156,
        frameType: "ALUMINUM",
        frameSize: "20x24",
        status: "COATED_EMULSION",
      },
      {
        screenNumber: "Screen #103",
        meshCount: 156,
        frameType: "ALUMINUM",
        frameSize: "20x24",
        status: "EXPOSED_READY",
        currentDesignId: kaixLogoTee.id,
      },
      {
        screenNumber: "Screen #104",
        meshCount: 230,
        frameType: "RETENSIONABLE",
        frameSize: "23x31",
        status: "ON_PRESS",
        currentDesignId: downtownBrewing.id,
      },
      {
        screenNumber: "Screen #105",
        meshCount: 110,
        frameType: "WOOD",
        frameSize: "20x24",
        status: "NEEDS_RECLAIM",
      },
    ],
  });

  await prisma.finishedGood.createMany({
    data: [
      {
        designId: kaixLogoTee.id,
        colorwayId: kaixLogoTee.colorways[0]!.id,
        garmentStyle: "Gildan 5000",
        color: "Black",
        size: "M",
        quantityOnHand: 42,
        unitPrice: 15,
      },
      {
        designId: kaixLogoTee.id,
        colorwayId: kaixLogoTee.colorways[1]!.id,
        garmentStyle: "Gildan 5000",
        color: "Navy",
        size: "L",
        quantityOnHand: 18,
        unitPrice: 15,
      },
      {
        designId: dtfSamplePack.id,
        colorwayId: dtfSamplePack.colorways[0]!.id,
        garmentStyle: "Bella+Canvas 3001",
        color: "Heather Grey",
        size: "M",
        quantityOnHand: 24,
        unitPrice: 18,
      },
      {
        designId: downtownBrewing.id,
        colorwayId: downtownBrewing.colorways[0]!.id,
        garmentStyle: "Bella+Canvas 3001",
        color: "Black",
        size: "L",
        quantityOnHand: 30,
        unitPrice: 12.5,
      },
    ],
  });

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
