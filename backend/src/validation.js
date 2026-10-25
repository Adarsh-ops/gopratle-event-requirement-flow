import { z } from 'zod';

const budgetRange = z.enum(['under_25k', '25k_75k', '75k_2l', '2l_plus'], {
  errorMap: () => ({ message: 'Choose an estimated budget range.' }),
});
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date.').refine((value) => {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}, 'Use a valid calendar date.');
const optionalText = (max = 1000) => z.string().trim().max(max).optional().default('');
const sharedFields = {
  eventName: z.string().trim().min(2, 'Event name must have at least 2 characters.').max(120),
  eventType: z.enum(['Wedding', 'Corporate event', 'Concert', 'Festival', 'College event', 'Private party', 'Conference', 'Other']),
  dateMode: z.enum(['single', 'range']),
  startDate: dateString,
  endDate: z.union([dateString, z.literal('')]).optional().default(''),
  eventFormat: z.enum(['In person', 'Virtual', 'Hybrid']),
  location: z.string().trim().min(2, 'Add a city or location.').max(160),
  venue: optionalText(160),
};

const plannerDetails = z.object({
  eventScale: z.enum(['Intimate', 'Mid-sized', 'Large-scale']),
  guestCount: z.coerce.number().int().min(1).max(100000),
  planningStage: z.enum(['Just exploring', 'Shortlisting vendors', 'Ready to book']),
  servicesNeeded: z.array(z.enum(['Venue sourcing', 'Decor & styling', 'Catering', 'Audio & lighting', 'Photography / video', 'Guest management', 'Logistics'])).min(1).max(7),
  budgetRange,
  specialRequirements: optionalText(2200),
});

const performerDetails = z.object({
  performerType: z.enum(['Musician / band', 'DJ', 'Dancer', 'Host / emcee', 'Comedian', 'Speaker', 'Other']),
  genre: z.string().trim().min(2).max(100),
  performanceDuration: z.enum(['Under 30 minutes', '30–60 minutes', '1–2 hours', '2+ hours']),
  groupSize: z.coerce.number().int().min(1).max(100),
  budgetRange,
  equipmentNeeds: z.array(z.enum(['PA / sound system', 'Microphone', 'DJ setup', 'Stage lighting', 'Backline instruments', 'Green room'])).max(6),
  specialRequirements: optionalText(2200),
});

const crewDetails = z.object({
  crewRole: z.enum(['Sound engineer', 'Lighting technician', 'Stage manager', 'Photographer', 'Videographer', 'Security', 'Setup / teardown', 'Other']),
  crewCount: z.coerce.number().int().min(1).max(500),
  experienceLevel: z.enum(['Entry-level', 'Experienced', 'Lead / specialist']),
  shiftHours: z.enum(['Up to 4 hours', '4–8 hours', '8–12 hours', 'Multiple days']),
  budgetRange,
  skillsNeeded: z.array(z.enum(['Audio / sound', 'Lighting', 'Stage setup', 'Rigging', 'Photography', 'Videography', 'Guest management', 'Setup & teardown'])).max(8),
  specialRequirements: optionalText(2200),
});

export const requirementSchema = z.discriminatedUnion('category', [
  z.object({ ...sharedFields, category: z.literal('planner'), details: plannerDetails }),
  z.object({ ...sharedFields, category: z.literal('performer'), details: performerDetails }),
  z.object({ ...sharedFields, category: z.literal('crew'), details: crewDetails }),
]).superRefine((data, ctx) => {
  if (data.dateMode === 'range') {
    if (!data.endDate || !/^\d{4}-\d{2}-\d{2}$/.test(data.endDate)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'Add the final date for your event range.' });
    } else if (data.endDate < data.startDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'End date must be on or after the start date.' });
    }
  }
});
