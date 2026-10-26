'use client';

import { FormEvent, ReactNode, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  MapPin,
  Mic2,
  PartyPopper,
  ShieldCheck,
  Sparkles,
  Users,
  WandSparkles,
  LoaderCircle,
  Send,
  Building2,
} from 'lucide-react';

type Category = 'planner' | 'performer' | 'crew';
type AnyValue = string | string[];
type DetailMap = Record<string, AnyValue>;
type Basics = {
  eventName: string;
  eventType: string;
  dateMode: 'single' | 'range';
  startDate: string;
  endDate: string;
  eventFormat: string;
  location: string;
  venue: string;
  category: Category;
};
type SubmissionResult = { id: string; referenceCode: string; category: Category; createdAt: string };

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');
const STEP_LABELS = ['Event basics', 'Category details', 'Requirements', 'Review & submit'];
const EVENT_TYPES = ['Wedding', 'Corporate event', 'Concert', 'Festival', 'College event', 'Private party', 'Conference', 'Other'];
const CATEGORY_OPTIONS: { value: Category; title: string; description: string; icon: typeof ClipboardList }[] = [
  { value: 'planner', title: 'Event planner', description: 'Find a partner to plan and coordinate your event.', icon: ClipboardList },
  { value: 'performer', title: 'Performer', description: 'Book talent that makes the moment memorable.', icon: Mic2 },
  { value: 'crew', title: 'Event crew', description: 'Bring skilled people in to make it happen.', icon: Users },
];
const BUDGET_OPTIONS = [
  { value: 'under_25k', label: 'Under ₹25,000' },
  { value: '25k_75k', label: '₹25,000–₹75,000' },
  { value: '75k_2l', label: '₹75,000–₹2 lakh' },
  { value: '2l_plus', label: '₹2 lakh+' },
];
const INITIAL_BASICS: Basics = {
  eventName: '', eventType: '', dateMode: 'single', startDate: '', endDate: '',
  eventFormat: 'In person', location: '', venue: '', category: 'planner',
};
const INITIAL_DETAILS: Record<Category, DetailMap> = {
  planner: { eventScale: 'Mid-sized', guestCount: '100', planningStage: 'Shortlisting vendors', servicesNeeded: [], budgetRange: '25k_75k', specialRequirements: '' },
  performer: { performerType: 'Musician / band', genre: '', performanceDuration: '30–60 minutes', groupSize: '1', budgetRange: '25k_75k', equipmentNeeds: [], specialRequirements: '' },
  crew: { crewRole: 'Sound engineer', crewCount: '1', experienceLevel: 'Experienced', shiftHours: '4–8 hours', budgetRange: 'under_25k', skillsNeeded: [], specialRequirements: '' },
};
const CATEGORY_COPY: Record<Category, { title: string; description: string; icon: typeof ClipboardList; step2: string; step3: string }> = {
  planner: { title: 'Event planner', description: 'Share the scale of your event and the services you need.', icon: ClipboardList, step2: 'Planning details', step3: 'Services & budget' },
  performer: { title: 'Performer', description: 'Tell us what kind of talent you are booking and what the set requires.', icon: Mic2, step2: 'Performance details', step3: 'Production & budget' },
  crew: { title: 'Event crew', description: 'Describe the crew role, experience level and shift requirements.', icon: Users, step2: 'Crew requirements', step3: 'Skills & budget' },
};

function localDateString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
function labelBudget(value: AnyValue) {
  if (typeof value !== 'string') return 'Not specified';
  return BUDGET_OPTIONS.find((option) => option.value === value)?.label || value;
}
function formatDate(value: string) {
  if (!value) return 'Not set';
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Field({ label, hint, children, wide = false, required = false }: { label: string; hint?: string; children: ReactNode; wide?: boolean; required?: boolean }) {
  return (
    <div className={`field${wide ? ' field-wide' : ''}`}>
      <label className="field-label">{label}{required && <span className="required-mark"> *</span>}</label>
      {children}
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}

function ChoiceGrid({ options, selected, onChange }: { options: string[]; selected: string[]; onChange: (value: string[]) => void }) {
  function toggle(option: string) {
    onChange(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option]);
  }
  return (
    <div className="choice-grid">
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <button type="button" key={option} className={`choice-chip${active ? ' selected' : ''}`} onClick={() => toggle(option)} aria-pressed={active}>
            <span className="chip-check">{active ? <Check size={13} strokeWidth={3} /> : <span className="chip-dot" />}</span>
            {option}
          </button>
        );
      })}
    </div>
  );
}

function SelectField({ label, value, options, onChange, required = false }: { label: string; value: string; options: string[]; onChange: (value: string) => void; required?: boolean }) {
  return (
    <Field label={label} required={required}>
      <div className="select-wrap">
        <select className="control select-control" value={value} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => option === 'Choose an event type' ? <option key={option} value="">Choose an event type</option> : <option key={option} value={option}>{option}</option>)}
        </select>
        <ChevronRight className="select-chevron" size={16} />
      </div>
    </Field>
  );
}

export default function Home() {
  const [step, setStep] = useState(1);
  const [basics, setBasics] = useState<Basics>(INITIAL_BASICS);
  const [detailsByCategory, setDetailsByCategory] = useState<Record<Category, DetailMap>>(INITIAL_DETAILS);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [apiError, setApiError] = useState('');
  const minimumDate = useMemo(() => localDateString(), []);
  const currentDetails = detailsByCategory[basics.category];
  const combinedRequirements = [
    typeof currentDetails.detailsNote === 'string' ? currentDetails.detailsNote.trim() : '',
    typeof currentDetails.specialRequirements === 'string' ? currentDetails.specialRequirements.trim() : '',
  ].filter(Boolean).join('\n\n');
  const currentCategory = CATEGORY_COPY[basics.category];
  const Icon = currentCategory.icon;

  function updateBasics<K extends keyof Basics>(key: K, value: Basics[K]) {
    setBasics((previous) => {
      const next = { ...previous, [key]: value };
      if (key === 'dateMode' && value === 'single') next.endDate = '';
      if (key === 'dateMode' && value === 'range' && !previous.endDate) next.endDate = previous.startDate;
      if (key === 'startDate' && previous.dateMode === 'range' && previous.endDate && previous.endDate < String(value)) next.endDate = String(value);
      return next;
    });
    setFormError('');
  }

  function updateDetail(key: string, value: AnyValue) {
    setDetailsByCategory((previous) => ({
      ...previous,
      [basics.category]: { ...previous[basics.category], [key]: value },
    }));
    setFormError('');
  }

  function validateStep(stepToValidate: number) {
    if (stepToValidate === 1) {
      if (basics.eventName.trim().length < 2) return 'Add an event name with at least 2 characters.';
      if (!basics.eventType) return 'Choose the type of event you are planning.';
      if (!basics.startDate) return 'Choose the event date.';
      if (basics.dateMode === 'range' && !basics.endDate) return 'Choose the final date for your event.';
      if (basics.dateMode === 'range' && basics.endDate < basics.startDate) return 'The end date must be on or after the start date.';
      if (basics.location.trim().length < 2) return 'Add a city or location.';
    }
    if (stepToValidate === 2) {
      if (basics.category === 'planner') {
        if (!String(currentDetails.eventScale || '')) return 'Choose the scale of your event.';
        if (Number(currentDetails.guestCount) < 1 || !Number.isFinite(Number(currentDetails.guestCount))) return 'Add an estimated guest count.';
        if (!String(currentDetails.planningStage || '')) return 'Choose your planning stage.';
      }
      if (basics.category === 'performer') {
        if (String(currentDetails.genre || '').trim().length < 2) return 'Add a music genre, style or area of expertise.';
        if (Number(currentDetails.groupSize) < 1 || !Number.isFinite(Number(currentDetails.groupSize))) return 'Add the number of performers.';
      }
      if (basics.category === 'crew') {
        if (Number(currentDetails.crewCount) < 1 || !Number.isFinite(Number(currentDetails.crewCount))) return 'Add the number of crew members required.';
      }
    }
    if (stepToValidate === 3 && !String(currentDetails.budgetRange || '')) return 'Choose a budget range to continue.';
    if (stepToValidate === 3 && basics.category === 'planner' && (!Array.isArray(currentDetails.servicesNeeded) || currentDetails.servicesNeeded.length === 0)) return 'Select at least one service you need.';
    return '';
  }

  function goNext() {
    const message = validateStep(step);
    if (message) {
      setFormError(message);
      return;
    }
    setFormError('');
    setStep((previous) => Math.min(4, previous + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goBack() {
    setFormError('');
    setStep((previous) => Math.max(1, previous - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function buildPayload() {
    const raw = detailsByCategory[basics.category];
    const details: Record<string, unknown> = { ...raw };
    details.specialRequirements = combinedRequirements;
    delete details.detailsNote;
    if (basics.category === 'planner') details.guestCount = Number(raw.guestCount);
    if (basics.category === 'performer') details.groupSize = Number(raw.groupSize);
    if (basics.category === 'crew') details.crewCount = Number(raw.crewCount);
    return {
      ...basics,
      eventName: basics.eventName.trim(),
      location: basics.location.trim(),
      venue: basics.venue.trim(),
      endDate: basics.dateMode === 'range' ? basics.endDate : '',
      details,
    };
  }

  async function submitRequirement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const firstStepError = validateStep(1);
    const secondStepError = validateStep(2);
    const thirdStepError = validateStep(3);
    const message = firstStepError || secondStepError || thirdStepError;
    if (message) {
      setFormError(message);
      setStep(firstStepError ? 1 : secondStepError ? 2 : 3);
      return;
    }
    setIsSubmitting(true);
    setApiError('');
    setFormError('');
    try {
      const response = await fetch(`${API_URL}/api/requirements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      const responseBody = await response.json().catch(() => ({}));
      if (!response.ok || !responseBody.success) {
        const firstValidationError = responseBody.errors?.[0]?.message;
        throw new Error(firstValidationError || responseBody.message || 'We could not submit your requirement. Please try again.');
      }
      setResult(responseBody.data as SubmissionResult);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Something went wrong.';
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        setApiError(`We couldn't reach the API at ${API_URL}. Check that the backend is running and NEXT_PUBLIC_API_URL is correct.`);
      } else {
        setApiError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function startAnother() {
    setStep(1);
    setBasics(INITIAL_BASICS);
    setDetailsByCategory(INITIAL_DETAILS);
    setResult(null);
    setFormError('');
    setApiError('');
  }

  const dateSummary = basics.dateMode === 'range'
    ? `${formatDate(basics.startDate)} – ${formatDate(basics.endDate)}`
    : formatDate(basics.startDate);

  if (result) {
    return (
      <main className="page-shell success-shell">
        <div className="topbar"><a className="brand" href="#top"><span className="brand-mark"><Sparkles size={18} /></span><span>eventbrief</span></a><span className="topbar-label">REQUIREMENT STUDIO</span></div>
        <section className="success-card">
          <div className="success-icon"><CheckCircle2 size={36} /></div>
          <span className="eyebrow">SUBMISSION COMPLETE</span>
          <h1>Your brief is in good hands.</h1>
          <p className="success-copy">Your requirement has been saved. Keep this reference code handy if you need to discuss the request.</p>
          <div className="reference-box"><span>YOUR REFERENCE</span><strong>{result.referenceCode}</strong><button type="button" onClick={() => navigator.clipboard?.writeText(result.referenceCode)} className="copy-button">Copy code</button></div>
          <div className="success-summary">
            <div><span>Event</span><strong>{basics.eventName}</strong></div>
            <div><span>Request category</span><strong>{CATEGORY_COPY[result.category].title}</strong></div>
            <div><span>Submitted</span><strong>{new Date(result.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</strong></div>
          </div>
          <button className="button button-primary success-new" type="button" onClick={startAnother}>Create another requirement <ArrowRight size={17} /></button>
          <p className="privacy-note"><ShieldCheck size={14} /> Saved successfully to the requirements database.</p>
        </section>
        <footer className="page-footer"><span>EVENTBRIEF · REQUIREMENT BUILDER</span><span>Built for thoughtful event planning.</span></footer>
      </main>
    );
  }

  return (
    <main className="page-shell" id="top">
      <div className="topbar">
        <a className="brand" href="#top" aria-label="Eventbrief home"><span className="brand-mark"><Sparkles size={18} /></span><span>eventbrief</span></a>
        <div className="topbar-right"><span className="secure-label"><span className="secure-dot" /> Guided requirement flow</span><span className="topbar-divider" /><span className="topbar-label">FOR EVENTS THAT MATTER</span></div>
      </div>

      <div className="workspace">
        <aside className="intro-panel">
          <div className="intro-topline"><span className="intro-line" /><span>THE EVENT REQUIREMENT STUDIO</span></div>
          <div className="intro-headline">
            <span className="decorative-star star-one">✳</span>
            <h1>The right people make <em>the moment.</em></h1>
            <p>One clear brief. Better matches. Less back and forth.</p>
          </div>
          <div className="visual-card">
            <div className="visual-card-top"><span className="visual-pill"><span /> YOUR EVENT, YOUR WAY</span><span className="visual-spark"><Sparkles size={17} /></span></div>
            <div className="orbit orbit-one" /><div className="orbit orbit-two" />
            <div className="visual-center"><PartyPopper size={40} strokeWidth={1.4} /><span>Make it<br /><strong>happen.</strong></span></div>
            <div className="floating-note note-left"><CalendarDays size={15} /><span>Date<br /><b>Locked in</b></span></div>
            <div className="floating-note note-right"><Users size={15} /><span>Great people<br /><b>One brief away</b></span></div>
            <div className="visual-footer"><span>01 / 04</span><span>IDEA → EXECUTION</span></div>
          </div>
          <div className="intro-benefits">
            <div className="benefit"><span className="benefit-icon"><WandSparkles size={17} /></span><div><strong>Tailored to your needs</strong><span>Only see the questions relevant to your category.</span></div></div>
            <div className="benefit"><span className="benefit-icon"><ShieldCheck size={17} /></span><div><strong>Clear from the start</strong><span>Budget, date and expectations in one place.</span></div></div>
          </div>
          <div className="intro-bottom"><span>MADE FOR BETTER BRIEFS</span><span className="intro-bottom-mark">e.</span></div>
        </aside>

        <section className="form-panel" aria-label="Event requirement form">
          <div className="form-heading">
            <div><span className="eyebrow">LET&apos;S GET THE DETAILS RIGHT</span><h2>{step === 1 ? 'Tell us about the event' : step === 2 ? currentCategory.step2 : step === 3 ? currentCategory.step3 : 'Review your requirement'}</h2><p>{step === 1 ? 'Start with the essentials. You can add more detail in the next steps.' : step === 2 ? currentCategory.description : step === 3 ? 'A little more context helps set the right expectations.' : 'Give everything one final look before sending it through.'}</p></div>
            <div className="step-count"><strong>0{step}</strong><span>/ 04</span></div>
          </div>

          <div className="stepper" aria-label="Form progress">
            {STEP_LABELS.map((label, index) => {
              const number = index + 1;
              const complete = number < step;
              const active = number === step;
              return (
                <div className={`stepper-item${active ? ' active' : ''}${complete ? ' complete' : ''}`} key={label}>
                  <div className="stepper-top"><span className="stepper-number">{complete ? <Check size={13} strokeWidth={3} /> : `0${number}`}</span>{number < 4 && <span className="stepper-connector" />}</div>
                  <span className="stepper-label">{label}</span>
                </div>
              );
            })}
          </div>

          <form onSubmit={submitRequirement} noValidate>
            {step === 1 && <div className="form-content">
              <div className="section-caption"><span>01</span><strong>Event basics</strong><span className="caption-rule" /><span className="caption-note">All fields marked * are required</span></div>
              <div className="fields-grid">
                <Field label="What are we celebrating?" required wide>
                  <input className="control" value={basics.eventName} onChange={(e) => updateBasics('eventName', e.target.value)} placeholder="e.g. Asha & Rohan's wedding" maxLength={120} />
                </Field>
                <SelectField label="Type of event" value={basics.eventType} options={['Choose an event type', ...EVENT_TYPES]} onChange={(value) => updateBasics('eventType', value)} required />
                <Field label="Event format" required>
                  <div className="segmented-control">
                    {['In person', 'Virtual', 'Hybrid'].map((format) => <button key={format} type="button" className={basics.eventFormat === format ? 'segment active' : 'segment'} onClick={() => updateBasics('eventFormat', format)}>{format}</button>)}
                  </div>
                </Field>
                <Field label="Event date" required wide>
                  <div className="date-mode-toggle"><button type="button" className={basics.dateMode === 'single' ? 'date-mode active' : 'date-mode'} onClick={() => updateBasics('dateMode', 'single')}>One day</button><button type="button" className={basics.dateMode === 'range' ? 'date-mode active' : 'date-mode'} onClick={() => updateBasics('dateMode', 'range')}>Date range</button></div>
                  <div className={`date-inputs${basics.dateMode === 'range' ? ' is-range' : ''}`}>
                    <div className="input-icon-wrap"><CalendarDays size={16} /><input className="control" type="date" min={minimumDate} aria-label={basics.dateMode === 'range' ? 'Event start date' : 'Date of event'} value={basics.startDate} onChange={(e) => updateBasics('startDate', e.target.value)} /></div>
                    {basics.dateMode === 'range' && <><span className="date-to">TO</span><div className="input-icon-wrap"><CalendarDays size={16} /><input className="control" type="date" min={basics.startDate || minimumDate} aria-label="Event end date" value={basics.endDate} onChange={(e) => updateBasics('endDate', e.target.value)} /></div></>}
                  </div>
                </Field>
                <Field label="City or location" required>
                  <div className="input-icon-wrap"><MapPin size={16} /><input className="control" value={basics.location} onChange={(e) => updateBasics('location', e.target.value)} placeholder="e.g. Kolkata, West Bengal" maxLength={160} /></div>
                </Field>
                <Field label="Venue name" hint="Optional. Add it if you have already chosen a venue.">
                  <div className="input-icon-wrap"><Building2 size={16} /><input className="control" value={basics.venue} onChange={(e) => updateBasics('venue', e.target.value)} placeholder="e.g. The Grand Ballroom" maxLength={160} /></div>
                </Field>
              </div>
              <div className="category-section"><div className="category-heading"><div><span className="eyebrow">WHO DO YOU NEED?</span><h3>Choose a requirement category</h3></div><span className="required-caption">Required *</span></div>
                <div className="category-grid">
                  {CATEGORY_OPTIONS.map((category) => {
                    const CategoryIcon = category.icon;
                    const selected = basics.category === category.value;
                    return <button type="button" key={category.value} onClick={() => { updateBasics('category', category.value); setFormError(''); }} className={`category-card${selected ? ' selected' : ''}`} aria-pressed={selected}>
                      <span className="category-icon"><CategoryIcon size={20} /></span><span className="category-check">{selected && <Check size={12} strokeWidth={3} />}</span><strong>{category.title}</strong><span className="category-description">{category.description}</span><span className="category-select-label">{selected ? 'SELECTED' : 'SELECT'} {selected && <Check size={12} />}</span>
                    </button>;
                  })}
                </div>
              </div>
            </div>}

            {step === 2 && <div className="form-content">
              <div className="category-context"><span className="context-icon"><Icon size={21} /></span><div><span className="eyebrow">TAILORED QUESTIONS</span><strong>{currentCategory.title}</strong><p>{currentCategory.description}</p></div><span className="context-tag">STEP 02</span></div>
              {basics.category === 'planner' && <div className="fields-grid">
                <SelectField label="Event scale" value={String(currentDetails.eventScale)} options={['Intimate', 'Mid-sized', 'Large-scale']} onChange={(value) => updateDetail('eventScale', value)} required />
                <Field label="Estimated guest count" required><input className="control" type="number" min="1" max="100000" value={String(currentDetails.guestCount)} onChange={(e) => updateDetail('guestCount', e.target.value)} placeholder="e.g. 150" /></Field>
                <SelectField label="Where are you in the planning process?" value={String(currentDetails.planningStage)} options={['Just exploring', 'Shortlisting vendors', 'Ready to book']} onChange={(value) => updateDetail('planningStage', value)} required />
                <Field label="Anything else to know?" hint="Optional context for the planning partner." wide><textarea className="control textarea" value={String(currentDetails.detailsNote || '')} onChange={(e) => updateDetail('detailsNote', e.target.value)} placeholder="Share any early ideas, theme or priorities..." rows={3} maxLength={800} /></Field>
              </div>}
              {basics.category === 'performer' && <div className="fields-grid">
                <SelectField label="What kind of performer?" value={String(currentDetails.performerType)} options={['Musician / band', 'DJ', 'Dancer', 'Host / emcee', 'Comedian', 'Speaker', 'Other']} onChange={(value) => updateDetail('performerType', value)} required />
                <Field label="Genre, style or specialism" required><input className="control" value={String(currentDetails.genre)} onChange={(e) => updateDetail('genre', e.target.value)} placeholder="e.g. Indie pop, contemporary dance" maxLength={100} /></Field>
                <SelectField label="Performance duration" value={String(currentDetails.performanceDuration)} options={['Under 30 minutes', '30–60 minutes', '1–2 hours', '2+ hours']} onChange={(value) => updateDetail('performanceDuration', value)} required />
                <Field label="Number of performers" required><input className="control" type="number" min="1" max="100" value={String(currentDetails.groupSize)} onChange={(e) => updateDetail('groupSize', e.target.value)} /></Field>
                <Field label="Any performance notes?" hint="Optional, e.g. multiple sets or audience participation." wide><textarea className="control textarea" value={String(currentDetails.detailsNote || '')} onChange={(e) => updateDetail('detailsNote', e.target.value)} placeholder="Tell us about the vibe or audience..." rows={3} maxLength={800} /></Field>
              </div>}
              {basics.category === 'crew' && <div className="fields-grid">
                <SelectField label="Crew role" value={String(currentDetails.crewRole)} options={['Sound engineer', 'Lighting technician', 'Stage manager', 'Photographer', 'Videographer', 'Security', 'Setup / teardown', 'Other']} onChange={(value) => updateDetail('crewRole', value)} required />
                <Field label="Number of people needed" required><input className="control" type="number" min="1" max="500" value={String(currentDetails.crewCount)} onChange={(e) => updateDetail('crewCount', e.target.value)} /></Field>
                <SelectField label="Experience level" value={String(currentDetails.experienceLevel)} options={['Entry-level', 'Experienced', 'Lead / specialist']} onChange={(value) => updateDetail('experienceLevel', value)} required />
                <SelectField label="Expected shift duration" value={String(currentDetails.shiftHours)} options={['Up to 4 hours', '4–8 hours', '8–12 hours', 'Multiple days']} onChange={(value) => updateDetail('shiftHours', value)} required />
                <Field label="Any crew notes?" hint="Optional details about the venue, setup or event schedule." wide><textarea className="control textarea" value={String(currentDetails.detailsNote || '')} onChange={(e) => updateDetail('detailsNote', e.target.value)} placeholder="Share the key responsibilities..." rows={3} maxLength={800} /></Field>
              </div>}
            </div>}

            {step === 3 && <div className="form-content">
              <div className="category-context"><span className="context-icon"><Icon size={21} /></span><div><span className="eyebrow">LET&apos;S GET SPECIFIC</span><strong>{currentCategory.step3}</strong><p>Choose what matters most. You can add extra context at the end.</p></div><span className="context-tag">STEP 03</span></div>
              <div className="fields-grid">
                {basics.category === 'planner' && <Field label="Which services do you need?" hint="Select all that apply." wide required><ChoiceGrid options={['Venue sourcing', 'Decor & styling', 'Catering', 'Audio & lighting', 'Photography / video', 'Guest management', 'Logistics']} selected={Array.isArray(currentDetails.servicesNeeded) ? currentDetails.servicesNeeded : []} onChange={(value) => updateDetail('servicesNeeded', value)} /></Field>}
                {basics.category === 'performer' && <Field label="Production or equipment requirements" hint="Select anything you would need the organiser to provide." wide><ChoiceGrid options={['PA / sound system', 'Microphone', 'DJ setup', 'Stage lighting', 'Backline instruments', 'Green room']} selected={Array.isArray(currentDetails.equipmentNeeds) ? currentDetails.equipmentNeeds : []} onChange={(value) => updateDetail('equipmentNeeds', value)} /></Field>}
                {basics.category === 'crew' && <Field label="Skills or capabilities needed" hint="Select all that apply." wide><ChoiceGrid options={['Audio / sound', 'Lighting', 'Stage setup', 'Rigging', 'Photography', 'Videography', 'Guest management', 'Setup & teardown']} selected={Array.isArray(currentDetails.skillsNeeded) ? currentDetails.skillsNeeded : []} onChange={(value) => updateDetail('skillsNeeded', value)} /></Field>}
                <Field label="Estimated budget" required wide>
                  <div className="budget-grid">{BUDGET_OPTIONS.map((option) => <button type="button" key={option.value} className={`budget-option${currentDetails.budgetRange === option.value ? ' selected' : ''}`} onClick={() => updateDetail('budgetRange', option.value)}><span className="budget-radio">{currentDetails.budgetRange === option.value && <span />}</span><span>{option.label}</span></button>)}</div>
                </Field>
                <Field label="Anything else we should know?" hint="Optional. Add special requirements, access needs or non-negotiables." wide><textarea className="control textarea" value={String(currentDetails.specialRequirements)} onChange={(e) => updateDetail('specialRequirements', e.target.value)} placeholder="Add useful context for the person responding to your brief..." rows={4} maxLength={1200} /><span className="character-count">{String(currentDetails.specialRequirements).length}/1200</span></Field>
              </div>
              <div className="privacy-callout"><ShieldCheck size={18} /><p><strong>Specific beats generic.</strong> A clear budget and requirements help the right people decide whether they are a good fit.</p></div>
            </div>}

            {step === 4 && <div className="form-content review-content">
              <div className="review-ready"><span className="review-ready-icon"><CheckCircle2 size={19} /></span><div><strong>Looking good, {basics.eventName ? basics.eventName : 'your event'}.</strong><span>Review the summary below before submitting your requirement.</span></div></div>
              <div className="review-card">
                <div className="review-card-heading"><span className="review-icon"><CalendarDays size={17} /></span><div><span className="eyebrow">THE EVENT</span><h3>{basics.eventName}</h3></div><button type="button" onClick={() => setStep(1)} className="edit-button">Edit</button></div>
                <div className="review-grid"><div><span>Event type</span><strong>{basics.eventType}</strong></div><div><span>Format</span><strong>{basics.eventFormat}</strong></div><div><span>Date</span><strong>{dateSummary}</strong></div><div><span>Location</span><strong>{basics.location}</strong></div><div><span>Venue</span><strong>{basics.venue || 'Not specified'}</strong></div><div><span>Category</span><strong className="category-value">{currentCategory.title}</strong></div></div>
              </div>
              <div className="review-card">
                <div className="review-card-heading"><span className="review-icon"><Icon size={17} /></span><div><span className="eyebrow">THE REQUIREMENT</span><h3>{currentCategory.title} details</h3></div><button type="button" onClick={() => setStep(2)} className="edit-button">Edit</button></div>
                <div className="review-grid">
                  {basics.category === 'planner' && <><div><span>Scale</span><strong>{currentDetails.eventScale}</strong></div><div><span>Guest count</span><strong>{currentDetails.guestCount}</strong></div><div><span>Planning stage</span><strong>{currentDetails.planningStage}</strong></div><div><span>Services</span><strong>{(currentDetails.servicesNeeded as string[]).join(', ') || 'Not selected'}</strong></div></>}
                  {basics.category === 'performer' && <><div><span>Performer type</span><strong>{currentDetails.performerType}</strong></div><div><span>Genre / style</span><strong>{currentDetails.genre}</strong></div><div><span>Duration</span><strong>{currentDetails.performanceDuration}</strong></div><div><span>Group size</span><strong>{currentDetails.groupSize}</strong></div><div className="review-wide"><span>Equipment</span><strong>{(currentDetails.equipmentNeeds as string[]).join(', ') || 'No special equipment selected'}</strong></div></>}
                  {basics.category === 'crew' && <><div><span>Role</span><strong>{currentDetails.crewRole}</strong></div><div><span>Crew count</span><strong>{currentDetails.crewCount}</strong></div><div><span>Experience</span><strong>{currentDetails.experienceLevel}</strong></div><div><span>Shift</span><strong>{currentDetails.shiftHours}</strong></div><div className="review-wide"><span>Skills</span><strong>{(currentDetails.skillsNeeded as string[]).join(', ') || 'No specific skills selected'}</strong></div></>}
                  <div><span>Estimated budget</span><strong>{labelBudget(currentDetails.budgetRange)}</strong></div>
                  <div className="review-wide"><span>Special requirements</span><strong>{combinedRequirements || 'No additional requirements'}</strong></div>
                </div>
                <button type="button" onClick={() => setStep(3)} className="edit-button edit-requirements">Edit services & budget</button>
              </div>
              <div className="submission-note"><ShieldCheck size={18} /><span>Your requirement will be saved securely and labelled under <strong>{basics.category}</strong> in the database.</span></div>
              {apiError && <div className="error-message api-error" role="alert"><span className="error-dot" /><div><strong>Submission couldn&apos;t be completed</strong><p>{apiError}</p></div></div>}
            </div>}

            {formError && <div className="error-message" role="alert"><span className="error-dot" /><span>{formError}</span></div>}

            <div className={`form-actions${step === 1 ? ' first-step-actions' : ''}`}>
              {step > 1 ? <button type="button" className="button button-secondary" onClick={goBack} disabled={isSubmitting}><ArrowLeft size={16} /> Back</button> : <span className="action-note"><span className="required-mark">*</span> Required fields</span>}
              {step < 4 ? (
                <button
                  key={`continue-${step}`}
                  type="button"
                  className="button button-primary"
                  onClick={(event) => {
                    event.preventDefault();
                    goNext();
                  }}
                >
                  Continue <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  key="submit-requirement"
                  type="submit"
                  className="button button-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <LoaderCircle size={16} className="spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Submit requirement <Send size={15} />
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
          <div className="form-bottom"><span><Clock3 size={14} /> About 2 minutes to complete</span><span><ShieldCheck size={14} /> Your details stay with this request</span></div>
        </section>
      </div>
      <footer className="page-footer"><span>EVENTBRIEF · REQUIREMENT BUILDER</span><span>Built for thoughtful event planning.</span></footer>
    </main>
  );
}
