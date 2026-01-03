
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load Env
dotenv.config({ path: join(process.cwd(), '.env') });

// Import Models calling their files directly to ensure registration
// Note: In a standalone script, we need to ensure paths are correct.
// We assume run from root: npx tsx scripts/seedData.ts
import User from '../src/models/User';
import Category from '../src/models/Category';
import Product from '../src/models/Product';
import Order from '../src/models/Order';
import Expense from '../src/models/Expense';
import Ledger from '../src/models/Ledger';
import Contact from '../src/models/Contact';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Please define the MONGODB_URI environment variable');
    process.exit(1);
}

// Helpers
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomElement = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
const randomDate = (start: Date, end: Date) => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Data Constants
const CATEGORIES = [
    "Gel Polishes", "Nail Tools", "Acrylics", "UV Lamps", "Glitters & Foils", "Nail Care", "Extensions", "Brushes"
];

const PRODUCT_PREFIXES = [
    "Shiny", "Matte", "Sparkle", "Pro", "Ultra", "Glam", "Luxe", "Basic", "Neon", "Pastel"
];

const CONTACT_NAMES = [
    "Alice Salon", "Bob's Studio", "Charlie NailArt", "Diana Beauty", "Elegant Nails", "Fiona Style", "Grace Spa", "Hannah Artistry"
];

async function seed() {
    console.log('🌱 Starting Seed Process...');
    
    if (!mongoose.connection.readyState) {
        await mongoose.connect(MONGODB_URI as string);
        console.log('✅ Connected to MongoDB');
    }

    // 1. Clear Database
    console.log('🧹 Clearing existing data...');
    await Promise.all([
        User.deleteMany({}),
        Category.deleteMany({}),
        Product.deleteMany({}),
        Order.deleteMany({}),
        Expense.deleteMany({}),
        Ledger.deleteMany({}),
        Contact.deleteMany({})
    ]);
    console.log('✅ Data cleared');

    // 2. Create Users
    console.log('👤 Creating Users...');
    const ownerPassword = await bcrypt.hash(process.env.OWNER_PASSWORD || 'admin123', 10);
    const staffPassword = await bcrypt.hash('staff123', 10);

    const owner = await User.create({
        username: process.env.OWNER_USERNAME || 'owner',
        password: ownerPassword,
        role: 'OWNER',
        mustChangePassword: false
    });

    await User.create({
        username: 'staff_sarah',
        password: staffPassword,
        role: 'STAFF',
        mustChangePassword: true
    });

    console.log('✅ Users created');

    // 3. Create Categories
    console.log('📂 Creating Categories...');
    const categoryDocs = [];
    for (const name of CATEGORIES) {
        const cat = await Category.create({ name, status: 'ACTIVE' });
        categoryDocs.push(cat);
    }
    console.log(`✅ ${categoryDocs.length} Categories created`);

    // 4. Create Contacts
    console.log('📞 Creating Contacts...');
    const contacts = [];
    for (const name of CONTACT_NAMES) {
        const contact = await Contact.create({
            name,
            phoneNumber: `98${getRandomInt(10000000, 99999999)}`,
            email: `${name.replace(/\s/g, '').toLowerCase()}@example.com`
        });
        contacts.push(contact);
    }
    console.log(`✅ ${contacts.length} Contacts created`);

    // 5. Create Products
    console.log('💅 Creating Products...');
    const products = [];
    for (let i = 0; i < 60; i++) {
        const category = getRandomElement(categoryDocs);
        const costPrice = getRandomInt(100, 2000);
        const sellingPrice = Math.floor(costPrice * (Math.random() * 0.5 + 1.2)); // 20-70% margin
        
        const product = await Product.create({
            sku: `SKU-${1000 + i}`,
            name: `${getRandomElement(PRODUCT_PREFIXES)} ${category.name} ${i + 1}`,
            category: category._id, // Save ID as per schema
            costPrice,
            sellingPrice,
            mrp: Math.floor(sellingPrice * 1.2),
            quantity: getRandomInt(5, 100),
            status: 'ACTIVE'
        });
        products.push(product);
    }
    console.log(`✅ ${products.length} Products created`);

    // 6. Generate Sales, Expenses, Ledger (Jan 2025 - Jan 2026)
    console.log('📈 Generating Historical Data (Jan 2025 - Jan 2026)...');
    
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2026-01-31');
    let currentDate = new Date(startDate);
    
    let totalOrders = 0;
    let totalExpenses = 0;

    // Monthly Recurring Expenses
    const monthlyExpenses = [
        { title: 'Shop Rent', amount: 25000, category: 'Rent' },
        { title: 'Staff Salaries', amount: 40000, category: 'Salaries' },
        { title: 'Utilities Bill', amount: 4500, category: 'Utilities' },
        { title: 'Internet', amount: 1000, category: 'Utilities' },
    ];

    while (currentDate <= endDate) {
        const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
        const currentMonth = currentDate.getMonth();
        const currentDay = currentDate.getDate();

        // A. Create Orders (0-8 on weekdays, 5-15 on weekends)
        const orderCount = isWeekend ? getRandomInt(5, 15) : getRandomInt(2, 8);
        
        for (let k = 0; k < orderCount; k++) {
            const numItems = getRandomInt(1, 4);
            const items = [];
            let orderTotal = 0;
            let orderCost = 0;

            for (let j = 0; j < numItems; j++) {
                const prod = getRandomElement(products);
                const qty = getRandomInt(1, 3);
                items.push({
                    productName: prod.name,
                    quantity: qty,
                    price: prod.sellingPrice,
                    costPrice: prod.costPrice,
                    sku: prod.sku,
                    category: prod.category.toString() // Needed for schema? Order schema says String. Product has ObjectId. Logic in route uses lookup?
                    // Wait, Order schema has 'category' as String.
                    // The recent fix in route.ts assumes it MIGHT be there or looks it up.
                    // I will save the category Name to be robust.
                });
                // Need to fetch category Name since we just have ID in product object
                // Optimize: map IDs to names?
            }
            // Fix Category Name in items
            for(let item of items) {
                const catName = categoryDocs.find(c => c._id.toString() === item.category)?.name;
                item.category = catName || 'Uncategorized';
                orderTotal += item.price * item.quantity;
                // orderCost += item.costPrice * item.quantity; 
            }

            const status = Math.random() > 0.95 ? 'CANCELLED' : (Math.random() > 0.95 ? 'RETURNED' : 'COMPLETED');
            const paymentMethod = Math.random() > 0.4 ? 'UPI' : 'CASH';
            
            // Random time between 10 AM and 8 PM
            const orderDate = new Date(currentDate);
            orderDate.setHours(getRandomInt(10, 20), getRandomInt(0, 59));

            const contact = Math.random() > 0.7 ? getRandomElement(contacts) : null;

            await Order.create({
                orderId: `ORD-${orderDate.getTime()}-${k}`,
                customerName: contact ? contact.name : `Walk-in Customer ${getRandomInt(1, 100)}`,
                mobileNumber: contact ? contact.phoneNumber : `999${getRandomInt(1000000, 9999999)}`,
                items,
                totalAmount: orderTotal,
                paymentMethod,
                upiAmount: paymentMethod === 'UPI' ? orderTotal : 0,
                cashAmount: paymentMethod === 'CASH' ? orderTotal : 0,
                status,
                type: 'SALE',
                createdAt: orderDate,
                updatedAt: orderDate
            });
            totalOrders++;
        }

        // B. Daily Variable Expenses (Restock, Misc) - Random 20% chance
        if (Math.random() < 0.2) {
            const expenseDate = new Date(currentDate);
            expenseDate.setHours(getRandomInt(11, 18));
            await Expense.create({
                title: 'Daily Supplies / Tea',
                amount: getRandomInt(200, 1500),
                category: 'Misc',
                date: expenseDate,
                paymentMethod: 'CASH',
                cashAmount: 500
            });
            totalExpenses++;
        }

        // C. Monthly Expenses (on 1st of month)
        if (currentDay === 1) {
             for (const exp of monthlyExpenses) {
                const expenseDate = new Date(currentDate);
                expenseDate.setHours(10, 0);
                 await Expense.create({
                     ...exp,
                     date: expenseDate,
                     paymentMethod: 'UPI',
                     upiAmount: exp.amount
                 });
             }
        }

        // D. Ledger Entries (Occasional)
        if (Math.random() < 0.05) {
             const ledgerDate = new Date(currentDate);
             ledgerDate.setHours(14, 0);
             await Ledger.create({
                 partyName: getRandomElement(CONTACT_NAMES),
                 description: 'Stock Purchase Advance',
                 type: Math.random() > 0.5 ? 'PAYABLE' : 'RECEIVABLE',
                 amount: getRandomInt(5000, 20000),
                 status: Math.random() > 0.3 ? 'CLEARED' : 'PENDING',
                 date: ledgerDate,
                 paymentMethod: 'UPI'
             });
        }

        // Next Day
        currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`✅ Seed Complete!`);
    console.log(`   - Orders: ${totalOrders}`);
    console.log(`   - Products: ${products.length}`);
    console.log(`   - Users: 2`);
    
    process.exit(0);
}

seed().catch(err => {
    console.error('Seed Error:', err);
    process.exit(1);
});
