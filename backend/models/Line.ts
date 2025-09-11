/*
 * SPDX-License-Identifier: MIT
 */

import mongoose from 'mongoose';

const lineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  stations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Station' }]
});

export default mongoose.model('Line', lineSchema);
