import { PrismaClient, Role, CustomerType, CustomerStatus, MovementType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Clean existing data
  console.log('Clearing old data...');
  await prisma.challanItem.deleteMany({});
  await prisma.challan.deleteMany({});
  await prisma.stockMovementLog.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Create Users with different roles
  console.log('Creating users...');
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('password123', salt);

  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      password: hashedPassword,
      name: 'System Admin',
      role: Role.ADMIN,
    },
  });

  const salesUser = await prisma.user.create({
    data: {
      username: 'sales',
      password: hashedPassword,
      name: 'Sarah Connor (Sales)',
      role: Role.SALES,
    },
  });

  const warehouseUser = await prisma.user.create({
    data: {
      username: 'warehouse',
      password: hashedPassword,
      name: 'Walter White (Warehouse)',
      role: Role.WAREHOUSE,
    },
  });

  const accountsUser = await prisma.user.create({
    data: {
      username: 'accounts',
      password: hashedPassword,
      name: 'Abby Adams (Accounts)',
      role: Role.ACCOUNTS,
    },
  });

  console.log(`Created users: admin, sales, warehouse, accounts. Password for all: password123`);

  // 3. Create Sample Customers (CRM Module)
  console.log('Creating sample customers...');
  const customer1 = await prisma.customer.create({
    data: {
      name: 'Acme Corporates',
      mobile: '9876543210',
      email: 'contact@acme.com',
      businessName: 'Acme Corp Private Limited',
      gstNumber: '27AAAAA1111A1Z1',
      type: CustomerType.DISTRIBUTOR,
      address: '101, Industrial Area, Phase-I, Mumbai',
      status: CustomerStatus.ACTIVE,
      followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      notes: 'Key distributor for north zone. Prefers bulk deliveries on weekends.',
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      name: 'John Doe Retailers',
      mobile: '9123456789',
      email: 'john@doe.com',
      businessName: 'Doe Retail Outlets',
      type: CustomerType.RETAIL,
      address: '45, Main Market Road, Pune',
      status: CustomerStatus.LEAD,
      followUpDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      notes: 'New lead interested in household appliances. Needs initial pricing quotes.',
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      name: 'Global Traders',
      mobile: '9000100020',
      email: 'info@globaltraders.com',
      businessName: 'Global Traders & Co',
      gstNumber: '27BBBBB2222B2Z2',
      type: CustomerType.WHOLESALE,
      address: 'Plot 12, Sector 24, Navi Mumbai',
      status: CustomerStatus.ACTIVE,
      notes: 'Regular wholesaler. Excellent payment history.',
    },
  });

  console.log(`Created ${[customer1, customer2, customer3].length} sample customers.`);

  // 4. Create Sample Products (Inventory Module)
  console.log('Creating sample products...');
  const product1 = await prisma.product.create({
    data: {
      name: 'Premium Wireless Mouse',
      sku: 'MOUSE-PREM-001',
      category: 'Electronics',
      unitPrice: 25.0,
      currentStock: 100,
      minStockAlert: 15,
      location: 'Aisle 3, Bin B',
    },
  });

  const product2 = await prisma.product.create({
    data: {
      name: 'Mechanical Gaming Keyboard',
      sku: 'KB-MECH-RGB',
      category: 'Electronics',
      unitPrice: 75.0,
      currentStock: 50,
      minStockAlert: 10,
      location: 'Aisle 3, Bin C',
    },
  });

  const product3 = await prisma.product.create({
    data: {
      name: 'Ergonomic Office Chair',
      sku: 'CHAIR-ERGO-02',
      category: 'Furniture',
      unitPrice: 150.0,
      currentStock: 5, // Below minimum alert quantity to test UI alerts
      minStockAlert: 8,
      location: 'Aisle 7, Row 1',
    },
  });

  const product4 = await prisma.product.create({
    data: {
      name: 'USB-C Charging Cable 1.5m',
      sku: 'CABLE-USBC-15',
      category: 'Accessories',
      unitPrice: 9.99,
      currentStock: 250,
      minStockAlert: 20,
      location: 'Aisle 1, Bin A',
    },
  });

  console.log(`Created ${[product1, product2, product3, product4].length} sample products.`);

  // 5. Create Initial Stock Movement Logs
  console.log('Creating initial stock movement logs...');
  await prisma.stockMovementLog.create({
    data: {
      productId: product1.id,
      quantityChanged: 100,
      movementType: MovementType.IN,
      reason: 'Initial stock setup - Supplier delivery',
      createdById: warehouseUser.id,
    },
  });

  await prisma.stockMovementLog.create({
    data: {
      productId: product2.id,
      quantityChanged: 50,
      movementType: MovementType.IN,
      reason: 'Initial stock setup - Supplier delivery',
      createdById: warehouseUser.id,
    },
  });

  await prisma.stockMovementLog.create({
    data: {
      productId: product3.id,
      quantityChanged: 5,
      movementType: MovementType.IN,
      reason: 'Initial stock setup - Supplier delivery',
      createdById: warehouseUser.id,
    },
  });

  await prisma.stockMovementLog.create({
    data: {
      productId: product4.id,
      quantityChanged: 250,
      movementType: MovementType.IN,
      reason: 'Initial stock setup - Supplier delivery',
      createdById: warehouseUser.id,
    },
  });

  console.log('Stock movement logs generated.');
  console.log('✅ Database seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
