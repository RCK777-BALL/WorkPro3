/*
 * SPDX-License-Identifier: MIT
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

import User from '../models/User';
import Department from '../models/Department';
import Line from '../models/Line';
import Station from '../models/Station';
import Asset from '../models/Asset';
import Tenant from '../models/Tenant';
import Plant from '../models/Plant';
import logger from '../utils/logger';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || '';

if (!MONGO_URI) {
    logger.error('❌ MONGO_URI is not defined in .env');
    process.exit(1);
}

async function resetAndSeed() {
    try {
        await mongoose.connect(MONGO_URI);
        logger.info('✅ Connected to MongoDB');

 
        // 1️⃣ Clear existing data
        await Promise.all([
            User.deleteMany({}),
            Asset.deleteMany({}),
            Department.deleteMany({}),
            Tenant.deleteMany({}),
        ]);
        logger.info('🗑️ Existing data cleared');

        // 2️⃣ Insert seed data
        const tenant = await Tenant.create({
            name: 'Default Tenant',
            domain: 'default.local',
            branding: { primaryColor: '#0f766e', accentColor: '#ec4899' },
        });
        const plant = await Plant.create({ name: 'Default Plant', tenantId: tenant._id });
        await Department.create({
            name: 'Maintenance',
            tenantId: tenant._id,
            plant: plant._id,
            lines: [
                {
                    name: 'Line 1',
                    tenantId: tenant._id,
                    stations: [{ name: 'Station A', tenantId: tenant._id }],
                },
            ],
        });
        const adminPassword = await bcrypt.hash('admin123', 10);
        const adminUser = await User.create({
            email: 'admin@example.com',
            passwordHash: adminPassword,
            roles: ['admin']
        });
        logger.info(`👤 Created admin user: ${adminUser.email}`);

        // Seed Departments → Lines → Stations → Assets
        const productionDepartment = await Department.create({
            name: 'Production',
            tenantId: tenant._id,
            plant: plant._id,
        });
        const productionLine = await Line.create({ name: 'Line A', department: productionDepartment._id, tenantId: tenant._id });
        const productionStation = await Station.create({ name: 'Station 1', line: productionLine._id, tenantId: tenant._id });

 
        await Asset.insertMany([
            {
                name: 'Motor 1',
                type: 'Electrical',
                location: 'Plant 1',
                departmentId: productionDepartment._id,
                lineId: productionLine._id,
                stationId: productionStation._id,
                plant: plant._id,
                tenantId: tenant._id,
            },
            {
                name: 'Pump 2',
                type: 'Mechanical',
                location: 'Plant 1',
                departmentId: productionDepartment._id,
                lineId: productionLine._id,
                stationId: productionStation._id,
                plant: plant._id,
                tenantId: tenant._id,
            },
 
        ]);

        logger.info('🌱 Seeded sample Departments, Lines, Stations, and Assets');

        process.exit(0);
    } catch (err) {
        logger.error('❌ Error seeding:', err);
        process.exit(1);
    }
}

resetAndSeed();
