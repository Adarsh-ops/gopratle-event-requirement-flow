import test from 'node:test';
import assert from 'node:assert/strict';
import { requirementSchema } from '../src/validation.js';

const base = {
  eventName: 'Summer Product Launch',
  eventType: 'Corporate event',
  dateMode: 'range',
  startDate: '2027-03-10',
  endDate: '2027-03-11',
  eventFormat: 'In person',
  location: 'Kolkata, West Bengal',
  venue: 'Riverside Convention Centre',
};

test('accepts a valid planner requirement', () => {
  const result = requirementSchema.safeParse({
    ...base, category: 'planner',
    details: { eventScale: 'Mid-sized', guestCount: 250, planningStage: 'Shortlisting vendors', servicesNeeded: ['Venue sourcing', 'Catering'], budgetRange: '75k_2l', specialRequirements: '' },
  });
  assert.equal(result.success, true);
});

test('accepts a valid performer requirement', () => {
  const result = requirementSchema.safeParse({
    ...base, category: 'performer',
    details: { performerType: 'Musician / band', genre: 'Indie pop', performanceDuration: '1–2 hours', groupSize: 4, budgetRange: '25k_75k', equipmentNeeds: ['Microphone'], specialRequirements: '' },
  });
  assert.equal(result.success, true);
});

test('accepts a valid crew requirement', () => {
  const result = requirementSchema.safeParse({
    ...base, category: 'crew',
    details: { crewRole: 'Sound engineer', crewCount: 2, experienceLevel: 'Experienced', shiftHours: '4–8 hours', budgetRange: 'under_25k', skillsNeeded: ['Audio / sound'], specialRequirements: '' },
  });
  assert.equal(result.success, true);
});

test('rejects a date range whose end precedes the start', () => {
  const result = requirementSchema.safeParse({
    ...base, endDate: '2027-03-09', category: 'planner',
    details: { eventScale: 'Mid-sized', guestCount: 250, planningStage: 'Shortlisting vendors', servicesNeeded: ['Catering'], budgetRange: '75k_2l', specialRequirements: '' },
  });
  assert.equal(result.success, false);
  assert.ok(result.error.issues.some((issue) => issue.path.includes('endDate')));
});

test('rejects a planner request with no selected services', () => {
  const result = requirementSchema.safeParse({
    ...base, category: 'planner',
    details: { eventScale: 'Mid-sized', guestCount: 250, planningStage: 'Shortlisting vendors', servicesNeeded: [], budgetRange: '75k_2l', specialRequirements: '' },
  });
  assert.equal(result.success, false);
});
