import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import Department from '../models/Department';
import Line from '../models/Line';
import Station from '../models/Station';
import Asset from '../models/Asset';

import User from '../models/User';
import Asset from '../models/Asset';
import Department from '../models/Department';
import Tenant from '../models/Tenant';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || '';

if (!MONGO_URI) {
    console.error('❌ MONGO_URI is not defined in .env');
    process.exit(1);
}

async function resetAndSeed() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

 
        // 1️⃣ Clear existing data
        await Promise.all([
            User.deleteMany({}),
            Asset.deleteMany({}),
            Department.deleteMany({}),
            Tenant.deleteMany({}),
        ]);
        console.log('🗑️ Existing data cleared');

        // 2️⃣ Insert seed data
        const tenant = await Tenant.create({ name: 'Default Tenant' });
        const department = await Department.create({
            name: 'Maintenance',
            lines: [
                {
                    name: 'Line 1',
                    stations: [{ name: 'Station A' }],
                },
            ],
        });
        const line = department.lines[0];
        const station = line.stations[0];

        const adminPassword = await bcrypt.hash('admin123', 10);
        await User.create({
 
            email: 'admin@example.com',
            password: hashedPassword,
            role: 'admin'
        });
        console.log(`👤 Created admin user: ${adminUser.email}`);

        // Seed Departments → Lines → Stations → Assets
        const department = await Department.create({ name: 'Production' });
        const line = await Line.create({ name: 'Line A', department: department._id });
        const station = await Station.create({ name: 'Station 1', line: line._id });

 
        await Asset.insertMany([
            {
                name: 'Motor 1',
                type: 'Electrical',
                location: 'Plant 1',
                departmentId: department._id,
                lineId: line._id,
                stationId: station._id,
                tenantId: tenant._id,
            },
            {
                name: 'Pump 2',
                type: 'Mechanical',
                location: 'Plant 1',
                departmentId: department._id,
                lineId: line._id,
                stationId: station._id,
                tenantId: tenant._id,
            },
 
        ]);

        console.log('🌱 Seeded sample Departments, Lines, Stations, and Assets');

        process.exit(0);
    } catch (err) {
        console.error('❌ Error seeding:', err);
        process.exit(1);
    }
}

resetAndSeed();
