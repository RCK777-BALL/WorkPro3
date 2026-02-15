import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import AuthRoutes from '../../backend/routes/AuthRoutes';
import WorkHistoryRoutes from '../../backend/routes/WorkHistoryRoutes';
import Tenant from '../../backend/models/Tenant';

const TEST_PASSWORD = 'Password123!';

describe('Work history API', () => {
  let app: express.Express;
  let mongo: MongoMemoryServer;
  let token: string;
  let tenantId: string;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    await mongoose.connection.asPromise();

    app = express();
    app.use(cookieParser());
    app.use(express.json());
    app.use('/api/auth', AuthRoutes);
    app.use('/api/work-history', WorkHistoryRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongo) {
      await mongo.stop();
    }
  });

  beforeEach(async () => {
    await mongoose.connection.db?.dropDatabase();
    const tenant = await Tenant.create({ name: 'Work History Tenant' });
    tenantId = tenant._id.toString();

    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Maintenance Lead',
        email: 'lead@example.com',
        password: TEST_PASSWORD,
        tenantId,
        employeeId: 'EMP-WH-01',
      })
      .expect(201);

    expect(registerRes.body.success).toBe(true);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'lead@example.com', password: TEST_PASSWORD })
      .expect(200);

    expect(loginRes.body.success).toBe(true);
    token = loginRes.body.data.token as string;
  });

  it('persists and reloads work history records for a member', async () => {
    const memberId = 'member-42';
    const initialPayload = {
      memberId,
      metrics: {
        safety: {
          incidentRate: 0.5,
          safetyCompliance: 98,
          nearMisses: 1,
          lastIncidentDate: '2024-01-15',
          safetyMeetingsAttended: 8,
        },
        people: {
          attendanceRate: 97,
          teamCollaboration: 4.5,
          trainingHours: 24,
          certifications: ['Lockout/Tagout'],
          mentorshipHours: 12,
        },
        productivity: {
          completedTasks: 40,
          onTimeCompletion: 92,
          averageResponseTime: '2h',
          overtimeHours: 6,
          taskEfficiencyRate: 94,
        },
        improvement: {
          costSavings: 15000,
          suggestionsSubmitted: 3,
          suggestionsImplemented: 2,
          processImprovements: 1,
        },
      },
      recentWork: [
        {
          id: 'task-1',
          date: '2024-03-01',
          type: 'work_order',
          title: 'Boiler inspection',
          status: 'completed',
          duration: 3,
          notes: 'No issues detected',
        },
      ],
    };

    const emptyRes = await request(app)
      .get('/api/work-history')
      .set('Authorization', `Bearer ${token}`)
      .query({ memberId })
      .expect(200);

    expect(emptyRes.body.success).toBe(true);
    expect(emptyRes.body.data).toBeNull();

    const createRes = await request(app)
      .post('/api/work-history')
      .set('Authorization', `Bearer ${token}`)
      .send(initialPayload)
      .expect(201);

    expect(createRes.body.success).toBe(true);
    const createdId = createRes.body.data._id as string;
    expect(createRes.body.data.metrics.safety.incidentRate).toBe(0.5);
    expect(createRes.body.data.recentWork).toHaveLength(1);

    const fetchRes = await request(app)
      .get('/api/work-history')
      .set('Authorization', `Bearer ${token}`)
      .query({ memberId })
      .expect(200);

    expect(fetchRes.body.success).toBe(true);
    expect(fetchRes.body.data._id).toBe(createdId);
    expect(fetchRes.body.data.metrics.people.trainingHours).toBe(24);

    const updatedPayload = {
      ...initialPayload,
      metrics: {
        ...initialPayload.metrics,
        safety: {
          ...initialPayload.metrics.safety,
          incidentRate: 0.3,
        },
        people: {
          ...initialPayload.metrics.people,
          trainingHours: 32,
        },
      },
      recentWork: [
        initialPayload.recentWork[0],
        {
          id: 'task-2',
          date: '2024-03-10',
          type: 'maintenance',
          title: 'Conveyor belt alignment',
          status: 'completed',
          duration: 2,
        },
      ],
    };

    const updateRes = await request(app)
      .put(`/api/work-history/${createdId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(updatedPayload)
      .expect(200);

    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.metrics.people.trainingHours).toBe(32);
    expect(updateRes.body.data.recentWork).toHaveLength(2);

    const reloadRes = await request(app)
      .get('/api/work-history')
      .set('Authorization', `Bearer ${token}`)
      .query({ memberId })
      .expect(200);

    expect(reloadRes.body.success).toBe(true);
    expect(reloadRes.body.data.metrics.people.trainingHours).toBe(32);
    expect(reloadRes.body.data.metrics.safety.incidentRate).toBe(0.3);
    expect(reloadRes.body.data.recentWork).toHaveLength(2);
  });
});
