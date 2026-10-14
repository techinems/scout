/**
 * Idempotent seed: system roles, facility categories, and (in dev) a small
 * set of real-world Massachusetts facilities so the closest-facility engine
 * has something to chew on immediately.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { ALL_PERMISSIONS } from "../src/lib/rbac/permissions";
import { formatPhone } from "../src/lib/phone";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function upsertRole(name: string, description: string, permissions: string[], isSystem = true) {
  const role = await db.role.upsert({
    where: { name },
    update: { description, isSystem },
    create: { name, description, isSystem },
  });
  await db.rolePermission.deleteMany({ where: { roleId: role.id } });
  await db.rolePermission.createMany({
    data: permissions.map((permission) => ({ roleId: role.id, permission })),
  });
  return role;
}

const STATUS_TYPES = [
  { name: "Staged", shortCode: "STAGED", color: "#8b9dc3", sortOrder: 0 },
  { name: "En Route", shortCode: "ENRT", color: "#f5a623", sortOrder: 1 },
  { name: "On Scene", shortCode: "ONSCN", color: "#e5484d", sortOrder: 2 },
  { name: "Transporting", shortCode: "TXP", color: "#4c8dff", sortOrder: 3 },
  { name: "At Hospital", shortCode: "AT HOSP", color: "#30a46c", sortOrder: 4 },
  { name: "Clear", shortCode: "CLEAR", color: "#34b077", sortOrder: 5 },
  { name: "Returning to Base", shortCode: "RTB", color: "#8b9dc3", sortOrder: 6 },
];

const CATEGORIES = [
  { slug: "trauma-center", name: "Trauma Center", noteLabel: "TRAUMA", color: "#e5484d", sortOrder: 0, isAeromedical: false },
  { slug: "hospital", name: "Hospital", noteLabel: "HOSPITAL", color: "#4c8dff", sortOrder: 1, isAeromedical: false },
  { slug: "aeromedical", name: "Aeromedical Base", noteLabel: "AIR", color: "#f5a623", sortOrder: 2, isAeromedical: true },
  { slug: "veterinary", name: "Veterinary Hospital", noteLabel: "VET (K9)", color: "#30a46c", sortOrder: 3, isAeromedical: false },
  { slug: "burn-center", name: "Burn Center", noteLabel: "BURN", color: "#e93d82", sortOrder: 4, isAeromedical: false },
];

// Demo data (real Massachusetts facilities, pre-geocoded so dev works without
// a Maps key). Only seeded when SEED_DEMO_DATA=true — production deployments
// enter their own region's facilities.
const FACILITIES: {
  category: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  traumaLevel?: string;
  hasHelipad?: boolean;
}[] = [
  {
    category: "trauma-center",
    name: "UMass Memorial Medical Center — University Campus",
    address: "55 Lake Ave N, Worcester, MA 01655",
    lat: 42.276943,
    lng: -71.762233,
    phone: "(508) 334-1000",
    traumaLevel: "I",
    hasHelipad: true,
  },
  {
    category: "trauma-center",
    name: "Brigham and Women's Hospital",
    address: "75 Francis St, Boston, MA 02115",
    lat: 42.336102,
    lng: -71.106743,
    phone: "(617) 732-5500",
    traumaLevel: "I",
    hasHelipad: true,
  },
  {
    category: "hospital",
    name: "Saint Vincent Hospital",
    address: "123 Summer St, Worcester, MA 01608",
    lat: 42.264622,
    lng: -71.797895,
    phone: "(508) 363-5000",
  },
  {
    category: "hospital",
    name: "Milford Regional Medical Center",
    address: "14 Prospect St, Milford, MA 01757",
    lat: 42.142414,
    lng: -71.519935,
    phone: "(508) 473-1190",
  },
  {
    category: "aeromedical",
    name: "Boston MedFlight — Bedford Base",
    address: "Hanscom Field, Bedford, MA 01730",
    lat: 42.469993,
    lng: -71.28901,
    phone: "(781) 863-2213",
    hasHelipad: true,
  },
  {
    category: "veterinary",
    name: "Tufts Foster Hospital for Small Animals",
    address: "55 Willard St, North Grafton, MA 01536",
    lat: 42.226493,
    lng: -71.674654,
    phone: "(508) 839-5395",
  },
];

/**
 * Bring stored phone numbers into the canonical (xxx) xxx-xxxx format.
 * Saves already normalize, so this only catches rows written before that
 * existed or by other paths. Writes only rows whose value changes.
 */
async function normalizePhones() {
  let changed = 0;

  for (const f of await db.facility.findMany({ select: { id: true, phone: true } })) {
    const phone = formatPhone(f.phone);
    if (phone !== f.phone) {
      await db.facility.update({ where: { id: f.id }, data: { phone } });
      changed++;
    }
  }

  for (const p of await db.personnel.findMany({ select: { id: true, phone: true } })) {
    const phone = formatPhone(p.phone);
    if (phone !== p.phone) {
      await db.personnel.update({ where: { id: p.id }, data: { phone } });
      changed++;
    }
  }

  const missions = await db.mission.findMany({
    select: { id: true, localEmsDispatchPhone: true, localEmsPocPhone: true },
  });
  for (const m of missions) {
    const localEmsDispatchPhone = formatPhone(m.localEmsDispatchPhone);
    const localEmsPocPhone = formatPhone(m.localEmsPocPhone);
    if (localEmsDispatchPhone !== m.localEmsDispatchPhone || localEmsPocPhone !== m.localEmsPocPhone) {
      await db.mission.update({ where: { id: m.id }, data: { localEmsDispatchPhone, localEmsPocPhone } });
      changed++;
    }
  }

  if (changed > 0) console.log(`Normalized phone numbers on ${changed} record(s).`);
}

async function main() {
  console.log("Seeding roles…");
  await upsertRole("Administrator", "Full access to everything, including role management.", ALL_PERMISSIONS);
  await upsertRole(
    "Team Member",
    "Operational access: missions, facilities, roster, note generation.",
    ALL_PERMISSIONS.filter((p) => !p.startsWith("admin.") && p !== "status.configure" && p !== "note.configure"),
  );
  await upsertRole(
    "Observer",
    "Read-only access.",
    ALL_PERMISSIONS.filter((p) => p.endsWith(".view")),
  );

  console.log("Seeding crew status types…");
  for (const s of STATUS_TYPES) {
    await db.crewStatusType.upsert({
      where: { name: s.name },
      update: { shortCode: s.shortCode, color: s.color, sortOrder: s.sortOrder },
      create: s,
    });
  }

  console.log("Seeding facility categories…");
  for (const c of CATEGORIES) {
    await db.facilityCategory.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        noteLabel: c.noteLabel,
        color: c.color,
        sortOrder: c.sortOrder,
        isAeromedical: c.isAeromedical,
        isSystem: true,
      },
      create: { ...c, isSystem: true },
    });
  }

  await normalizePhones();

  if (process.env.SEED_DEMO_DATA !== "true") {
    console.log("Skipping demo facilities (set SEED_DEMO_DATA=true to include them).");
    console.log("Seed complete.");
    return;
  }

  console.log("Seeding demo facilities…");
  for (const f of FACILITIES) {
    const category = await db.facilityCategory.findUniqueOrThrow({ where: { slug: f.category } });
    const existing = await db.facility.findFirst({ where: { name: f.name } });
    const data = {
      name: f.name,
      categoryId: category.id,
      address: f.address,
      lat: f.lat,
      lng: f.lng,
      phone: f.phone ?? "",
      traumaLevel: f.traumaLevel ?? "",
      hasHelipad: f.hasHelipad ?? false,
    };
    if (existing) await db.facility.update({ where: { id: existing.id }, data });
    else await db.facility.create({ data });
  }

  console.log("Seed complete.");
}

main().finally(() => db.$disconnect());
