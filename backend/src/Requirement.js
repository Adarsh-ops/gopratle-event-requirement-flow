import mongoose from 'mongoose';

const requirementSchema = new mongoose.Schema(
  {
    referenceCode: { type: String, required: true, unique: true, index: true },
    eventName: { type: String, required: true, trim: true, maxlength: 120 },
    eventType: { type: String, required: true },
    dateMode: { type: String, required: true, enum: ['single', 'range'] },
    startDate: { type: String, required: true },
    endDate: { type: String, default: '' },
    eventFormat: { type: String, required: true, enum: ['In person', 'Virtual', 'Hybrid'] },
    location: { type: String, required: true, trim: true },
    venue: { type: String, default: '' },
    category: { type: String, required: true, enum: ['planner', 'performer', 'crew'], index: true },
    details: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true, minimize: false, versionKey: false },
);

requirementSchema.index({ category: 1, createdAt: -1 });

export const Requirement = mongoose.models.Requirement || mongoose.model('Requirement', requirementSchema);
