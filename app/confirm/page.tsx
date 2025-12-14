// @ts-nocheck
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

import {
  CheckCircle, AlertCircle, XCircle, Edit3, Building2, User,
  Mail, Globe, Mic, MessageSquare, Clock, Target, Loader2,
  ArrowRight, RefreshCw, AlertTriangle
} from 'lucide-react';

interface ExtractedData {
  company_name?: string;
  contact_name?: string;
  company_email?: string;
  company_website?: string;
  agent_name?: string;
  agent_role?: string;
  interview_purpose?: string;
  target_audience?: string;
  interview_style?: string;
  tone?: string;
  duration_minutes?: number;
  key_topics?: string[];
  key_questions?: string[];
  notification_email?: string;
  constraints?: string;
  voice_gender?: string;
}

interface Validation {
  is_complete: boolean;
  missing_fields: string[];
  invalid_fields: string[];
  field_errors: Record<string, string>;
  confidence_score?: number;
}

interface Correction {
  original: string;
  corrected: string;
  reason: string;
}

const FIELD_LABELS: Record<string, string> = {
  company_name: 'Company Name',
  contact_name: 'Your Name',
  company_email: 'Company Email',
  company_website: 'Website',
  agent_name: 'Interviewer Name',
  agent_role: 'Interviewer Role',
  interview_purpose: 'Interview Purpose',
  target_audience: 'Target Audience',
  interview_style: 'Interview Style',
  tone: 'Tone',
  duration_minutes: 'Duration',
  key_topics: 'Key Topics',
  key_questions: 'Key Questions',
  notification_email: 'Notification Email',
  constraints: 'Topics to Avoid',
  voice_gender: 'Voice',
};

const REQUIRED_FIELDS = [
  'company_name', 'contact_name', 'company_email', 'company_website',
  'agent_name', 'agent_role', 'interview_purpose', 'target_audience', 'interview_style',
  'tone', 'duration_minutes', 'key_topics', 'key_questions', 'notification_email'
];

function ConfirmPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const conversationId = searchParams.get('conversation');

  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState('');

  const [data, setData] = useState<ExtractedData>({});
  const [validation, setValidation] = useState<Validation>({
    is_complete: false,
    missing_fields: [],
    invalid_fields: [],
    field_errors: {},
  });
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [editingField, setEditingField] = useState<string | null>(null);

  useEffect(() => {
    if (conversationId) {
      extractDataFromConversation(conversationId);
    } else {
      setLoading(false);
      setError('No conversation ID provided');
    }
  }, [conversationId]);

  const extractDataFromConversation = async (convId: string) => {
    setExtracting(true);
    setError('');

    try {
      // First, get the transcript from ElevenLabs or our DB
      const transcriptRes = await fetch(`/api/get-transcript?conversationId=${convId}`);
      if (!transcriptRes.ok) {
        throw new Error('Could not retrieve conversation transcript');
      }
      const { transcript } = await transcriptRes.json();

      // Extract structured data
      const extractRes = await fetch('/api/extract-setup-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, conversationId: convId }),
      });

      if (!extractRes.ok) {
        throw new Error('Failed to extract data from conversation');
      }

      const result = await extractRes.json();

      setData(result.extracted_data || {});
      setValidation(result.validation || {
        is_complete: false,
        missing_fields: REQUIRED_FIELDS,
        invalid_fields: [],
        field_errors: {},
      });
      setCorrections(result.corrections_made || []);

    } catch (err: any) {
      setError(err.message || 'Failed to process conversation');
    } finally {
      setLoading(false);
      setExtracting(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));

    // Re-validate
    const newMissing = validation.missing_fields.filter(f => f !== field || !value);
    const newInvalid = validation.invalid_fields.filter(f => f !== field);

    // Check if now valid
    if (value && validation.invalid_fields.includes(field)) {
      // Basic validation
      if (field.includes('email') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        if (!newInvalid.includes(field)) newInvalid.push(field);
      }
    }

    setValidation(prev => ({
      ...prev,
      missing_fields: newMissing,
      invalid_fields: newInvalid,
      is_complete: newMissing.length === 0,
    }));

    setEditingField(null);
  };

  const addArrayItem = (field: 'key_topics' | 'key_questions', value: string) => {
    if (!value.trim()) return;
    const current = data[field] || [];
    setData(prev => ({ ...prev, [field]: [...current, value.trim()] }));

    // Update validation if we now have enough items
    const newCount = current.length + 1;
    if (newCount >= 3 && validation.missing_fields.includes(field)) {
      setValidation(prev => ({
        ...prev,
        missing_fields: prev.missing_fields.filter(f => f !== field),
        is_complete: prev.missing_fields.filter(f => f !== field).length === 0,
      }));
    }
  };

  const removeArrayItem = (field: 'key_topics' | 'key_questions', index: number) => {
    const current = data[field] || [];
    const updated = current.filter((_, i) => i !== index);
    setData(prev => ({ ...prev, [field]: updated }));

    // Update validation if we now have too few items
    if (updated.length < 3 && !validation.missing_fields.includes(field)) {
      setValidation(prev => ({
        ...prev,
        missing_fields: [...prev.missing_fields, field],
        is_complete: false,
      }));
    }
  };

  const canBuild = validation.is_complete && validation.invalid_fields.length === 0;

  const startBuild = async () => {
    if (!canBuild) {
      setError('Please fix all errors before building');
      return;
    }

    setBuilding(true);
    setError('');

    try {
      // Create the agent
      const response = await fetch('/api/create-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          conversation_id: conversationId,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create agent');
      }

      const result = await response.json();

      // Redirect to success page
      router.push(`/success?agentId=${result.agentId}&slug=${result.slug}`);

    } catch (err: any) {
      setError(err.message || 'Build failed');
      setBuilding(false);
    }
  };

  const getFieldStatus = (field: string): 'valid' | 'missing' | 'invalid' => {
    if (validation.missing_fields.includes(field)) return 'missing';
    if (validation.invalid_fields.includes(field)) return 'invalid';
    return 'valid';
  };

  const renderFieldStatus = (field: string) => {
    const status = getFieldStatus(field);
    if (status === 'valid') return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (status === 'missing') return <AlertCircle className="w-4 h-4 text-orange-400" />;
    return <XCircle className="w-4 h-4 text-red-400" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Processing your conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Review Your Setup</h1>
          <p className="text-slate-400">
            Please verify all information before we build your AI interviewer
          </p>
        </div>

        {/* Validation Summary */}
        <div className={`mb-6 p-4 rounded-xl border ${
          canBuild 
            ? 'bg-green-500/10 border-green-500/30'
            : 'bg-orange-500/10 border-orange-500/30'
        }`}>
          <div className="flex items-center gap-3">
            {canBuild ? (
              <>
                <CheckCircle className="w-6 h-6 text-green-400" />
                <div>
                  <div className="font-medium text-green-400">Ready to Build!</div>
                  <div className="text-sm text-slate-400">All required information collected</div>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle className="w-6 h-6 text-orange-400" />
                <div>
                  <div className="font-medium text-orange-400">
                    {validation.missing_fields.length} missing, {validation.invalid_fields.length} invalid
                  </div>
                  <div className="text-sm text-slate-400">Please fix highlighted fields below</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Corrections Made */}
        {corrections.length > 0 && (
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
            <div className="font-medium text-blue-400 mb-2">Auto-corrections Applied:</div>
            <ul className="text-sm space-y-1">
              {corrections.map((c, i) => (
                <li key={i} className="text-slate-300">
                  <span className="line-through text-slate-500">{c.original}</span>
                  {' → '}
                  <span className="text-green-400">{c.corrected}</span>
                  <span className="text-slate-500 ml-2">({c.reason})</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
            {error}
          </div>
        )}

        {/* Form Sections */}
        <div className="space-y-6">
          {/* Company Info */}
          <Section title="Company Information" icon={Building2}>
            <Field
              field="company_name"
              label={FIELD_LABELS.company_name}
              value={data.company_name}
              status={getFieldStatus('company_name')}
              error={validation.field_errors?.company_name}
              editing={editingField === 'company_name'}
              onEdit={() => setEditingField('company_name')}
              onSave={(v) => updateField('company_name', v)}
              required
            />
            <Field
              field="contact_name"
              label={FIELD_LABELS.contact_name}
              value={data.contact_name}
              status={getFieldStatus('contact_name')}
              error={validation.field_errors?.contact_name}
              editing={editingField === 'contact_name'}
              onEdit={() => setEditingField('contact_name')}
              onSave={(v) => updateField('contact_name', v)}
              required
            />
            <Field
              field="company_email"
              label={FIELD_LABELS.company_email}
              value={data.company_email}
              status={getFieldStatus('company_email')}
              error={validation.field_errors?.company_email}
              editing={editingField === 'company_email'}
              onEdit={() => setEditingField('company_email')}
              onSave={(v) => updateField('company_email', v)}
              type="email"
              required
            />
            <Field
              field="company_website"
              label={FIELD_LABELS.company_website}
              value={data.company_website}
              status={getFieldStatus('company_website')}
              error={validation.field_errors?.company_website}
              editing={editingField === 'company_website'}
              onEdit={() => setEditingField('company_website')}
              onSave={(v) => updateField('company_website', v)}
              type="url"
              required
            />
          </Section>

          {/* Agent Setup */}
          <Section title="AI Interviewer" icon={Mic}>
            <Field
              field="agent_name"
              label={FIELD_LABELS.agent_name}
              value={data.agent_name}
              status={getFieldStatus('agent_name')}
              error={validation.field_errors?.agent_name}
              editing={editingField === 'agent_name'}
              onEdit={() => setEditingField('agent_name')}
              onSave={(v) => updateField('agent_name', v)}
              required
            />
            <Field
              field="agent_role"
              label={FIELD_LABELS.agent_role}
              value={data.agent_role}
              status={getFieldStatus('agent_role')}
              error={validation.field_errors?.agent_role}
              editing={editingField === 'agent_role'}
              onEdit={() => setEditingField('agent_role')}
              onSave={(v) => updateField('agent_role', v)}
              placeholder="e.g., UX Researcher, HR Recruiter, Detective Inspector"
              required
            />
            <Field
              field="interview_purpose"
              label={FIELD_LABELS.interview_purpose}
              value={data.interview_purpose}
              status={getFieldStatus('interview_purpose')}
              error={validation.field_errors?.interview_purpose}
              editing={editingField === 'interview_purpose'}
              onEdit={() => setEditingField('interview_purpose')}
              onSave={(v) => updateField('interview_purpose', v)}
              required
            />
            <Field
              field="target_audience"
              label={FIELD_LABELS.target_audience}
              value={data.target_audience}
              status={getFieldStatus('target_audience')}
              error={validation.field_errors?.target_audience}
              editing={editingField === 'target_audience'}
              onEdit={() => setEditingField('target_audience')}
              onSave={(v) => updateField('target_audience', v)}
              required
            />
            <SelectField
              field="interview_style"
              label={FIELD_LABELS.interview_style}
              value={data.interview_style}
              options={['structured', 'conversational', 'mixed']}
              status={getFieldStatus('interview_style')}
              onChange={(v) => updateField('interview_style', v)}
              required
            />
            <SelectField
              field="tone"
              label={FIELD_LABELS.tone}
              value={data.tone}
              options={['professional', 'friendly', 'casual', 'formal']}
              status={getFieldStatus('tone')}
              onChange={(v) => updateField('tone', v)}
              required
            />
            <SelectField
              field="duration_minutes"
              label={FIELD_LABELS.duration_minutes}
              value={data.duration_minutes?.toString()}
              options={['5', '10', '15', '20', '30']}
              status={getFieldStatus('duration_minutes')}
              onChange={(v) => updateField('duration_minutes', parseInt(v))}
              suffix=" minutes"
              required
            />
            <SelectField
              field="voice_gender"
              label={FIELD_LABELS.voice_gender}
              value={data.voice_gender}
              options={['female', 'male']}
              status={getFieldStatus('voice_gender')}
              onChange={(v) => updateField('voice_gender', v)}
            />
          </Section>

          {/* Interview Content */}
          <Section title="Interview Content" icon={MessageSquare}>
            <ArrayField
              field="key_topics"
              label={FIELD_LABELS.key_topics}
              values={data.key_topics || []}
              status={getFieldStatus('key_topics')}
              error={validation.field_errors?.key_topics}
              onAdd={(v) => addArrayItem('key_topics', v)}
              onRemove={(i) => removeArrayItem('key_topics', i)}
              minItems={3}
              required
            />
            <ArrayField
              field="key_questions"
              label={FIELD_LABELS.key_questions}
              values={data.key_questions || []}
              status={getFieldStatus('key_questions')}
              error={validation.field_errors?.key_questions}
              onAdd={(v) => addArrayItem('key_questions', v)}
              onRemove={(i) => removeArrayItem('key_questions', i)}
              minItems={3}
              required
            />
            <Field
              field="constraints"
              label={FIELD_LABELS.constraints}
              value={data.constraints}
              status={getFieldStatus('constraints')}
              editing={editingField === 'constraints'}
              onEdit={() => setEditingField('constraints')}
              onSave={(v) => updateField('constraints', v)}
              placeholder="None specified"
            />
          </Section>

          {/* Notification */}
          <Section title="Notifications" icon={Mail}>
            <Field
              field="notification_email"
              label={FIELD_LABELS.notification_email}
              value={data.notification_email}
              status={getFieldStatus('notification_email')}
              error={validation.field_errors?.notification_email}
              editing={editingField === 'notification_email'}
              onEdit={() => setEditingField('notification_email')}
              onSave={(v) => updateField('notification_email', v)}
              type="email"
              required
            />
          </Section>
        </div>

        {/* Build Button */}
        <div className="mt-8 flex gap-4">
          <button
            onClick={() => extractDataFromConversation(conversationId!)}
            disabled={extracting}
            className="flex items-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
          >
            <RefreshCw className={`w-4 h-4 ${extracting ? 'animate-spin' : ''}`} />
            Re-extract
          </button>

          <button
            onClick={startBuild}
            disabled={!canBuild || building}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition ${
              canBuild
                ? 'bg-green-600 hover:bg-green-500'
                : 'bg-slate-700 cursor-not-allowed opacity-50'
            }`}
          >
            {building ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Building...
              </>
            ) : (
              <>
                Build My Interviewer
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function Section({
  title,
  icon: Icon,
  children
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h2 className="flex items-center gap-2 font-semibold mb-4">
        <Icon className="w-5 h-5 text-purple-400" />
        {title}
      </h2>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

function Field({
  field,
  label,
  value,
  status,
  error,
  editing,
  onEdit,
  onSave,
  type = 'text',
  placeholder,
  required,
}: {
  field: string;
  label: string;
  value?: string;
  status: 'valid' | 'missing' | 'invalid';
  error?: string;
  editing: boolean;
  onEdit: () => void;
  onSave: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  const [editValue, setEditValue] = useState(value || '');

  useEffect(() => {
    setEditValue(value || '');
  }, [value]);

  const statusClass = {
    valid: 'border-slate-700',
    missing: 'border-orange-500/50 bg-orange-500/5',
    invalid: 'border-red-500/50 bg-red-500/5',
  }[status];

  if (editing) {
    return (
      <div className="space-y-2">
        <label className="text-sm text-slate-400">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
        <div className="flex gap-2">
          <input
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="flex-1 bg-slate-800 border border-purple-500 rounded-lg px-4 py-2 text-white focus:outline-none"
            autoFocus
          />
          <button
            onClick={() => onSave(editValue)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${statusClass}`}>
      <div className="flex-1">
        <div className="text-sm text-slate-400">
          {label} {required && <span className="text-red-400">*</span>}
        </div>
        <div className={status === 'missing' ? 'text-orange-400 italic' : 'text-white'}>
          {value || placeholder || '(not provided)'}
        </div>
        {error && <div className="text-xs text-red-400 mt-1">{error}</div>}
      </div>
      <div className="flex items-center gap-2">
        {status === 'valid' && <CheckCircle className="w-4 h-4 text-green-400" />}
        {status === 'missing' && <AlertCircle className="w-4 h-4 text-orange-400" />}
        {status === 'invalid' && <XCircle className="w-4 h-4 text-red-400" />}
        <button
          onClick={onEdit}
          className="p-1 hover:bg-slate-700 rounded transition"
        >
          <Edit3 className="w-4 h-4 text-slate-400" />
        </button>
      </div>
    </div>
  );
}

function SelectField({
  field,
  label,
  value,
  options,
  status,
  onChange,
  suffix = '',
  required,
}: {
  field: string;
  label: string;
  value?: string;
  options: string[];
  status: 'valid' | 'missing' | 'invalid';
  onChange: (value: string) => void;
  suffix?: string;
  required?: boolean;
}) {
  const statusClass = {
    valid: 'border-slate-700',
    missing: 'border-orange-500/50 bg-orange-500/5',
    invalid: 'border-red-500/50 bg-red-500/5',
  }[status];

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${statusClass}`}>
      <div className="flex-1">
        <div className="text-sm text-slate-400">
          {label} {required && <span className="text-red-400">*</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1 text-white"
        >
          <option value="">Select...</option>
          {options.map(opt => (
            <option key={opt} value={opt}>
              {opt.charAt(0).toUpperCase() + opt.slice(1)}{suffix}
            </option>
          ))}
        </select>
        {status === 'valid' && <CheckCircle className="w-4 h-4 text-green-400" />}
        {status === 'missing' && <AlertCircle className="w-4 h-4 text-orange-400" />}
      </div>
    </div>
  );
}

function ArrayField({
  field,
  label,
  values,
  status,
  error,
  onAdd,
  onRemove,
  minItems,
  required,
}: {
  field: string;
  label: string;
  values: string[];
  status: 'valid' | 'missing' | 'invalid';
  error?: string;
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
  minItems: number;
  required?: boolean;
}) {
  const [newValue, setNewValue] = useState('');

  const handleAdd = () => {
    if (newValue.trim()) {
      onAdd(newValue);
      setNewValue('');
    }
  };

  const statusClass = {
    valid: 'border-slate-700',
    missing: 'border-orange-500/50 bg-orange-500/5',
    invalid: 'border-red-500/50 bg-red-500/5',
  }[status];

  return (
    <div className={`p-3 rounded-lg border ${statusClass}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-slate-400">
          {label} {required && <span className="text-red-400">*</span>}
          <span className="ml-2 text-xs">
            ({values.length}/{minItems} minimum)
          </span>
        </div>
        {status === 'valid' && <CheckCircle className="w-4 h-4 text-green-400" />}
        {status === 'missing' && <AlertCircle className="w-4 h-4 text-orange-400" />}
      </div>

      {error && <div className="text-xs text-red-400 mb-2">{error}</div>}

      <ul className="space-y-2 mb-3">
        {values.map((item, i) => (
          <li key={i} className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
            <span className="text-slate-500 text-sm">{i + 1}.</span>
            <span className="flex-1 text-sm">{item}</span>
            <button
              onClick={() => onRemove(i)}
              className="text-slate-500 hover:text-red-400 transition"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <input
          type="text"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
          placeholder={`Add ${label.toLowerCase().replace('key ', '')}...`}
          className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500"
        />
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm"
        >
          Add
        </button>
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <ConfirmPageContent />
    </Suspense>
  );
}