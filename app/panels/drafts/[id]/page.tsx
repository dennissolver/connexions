// app/panels/drafts/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Edit3,
  Save,
  X,
  MessageSquare,
  Clock,
  Users,
  Sparkles,
  ArrowRight,
  Plus,
  Trash2
} from 'lucide-react';

interface PanelDraft {
  id: string;
  name: string;
  description: string;
  interview_type: string;
  target_audience: string;
  tone: string;
  duration_minutes: number;
  questions: string[];
  status: string;
  created_at: string;
}

interface EditableFieldProps {
  label: string;
  value: string;
  editing: boolean;
  editValue: string;
  onStartEdit: () => void;
  onCancel: () => void;
  onChange: (v: string) => void;
  onSave: () => void;
  placeholder?: string;
  required?: boolean;
  icon?: React.ElementType;
}

function EditableField({
  label,
  value,
  editing,
  editValue,
  onStartEdit,
  onCancel,
  onChange,
  onSave,
  placeholder,
  required,
  icon: Icon,
}: EditableFieldProps) {
  if (editing) {
    return (
      <div className="bg-white rounded-2xl border-2 border-violet-300 shadow-sm p-5">
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
        <input
          type="text"
          value={editValue}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500 mb-3"
          autoFocus
        />
        <div className="flex gap-2">
          <button
            onClick={onSave}
            className="flex items-center gap-2 px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
          <button
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-violet-200 transition cursor-pointer group"
      onClick={onStartEdit}
    >
      <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-gray-400" />}
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <div className="flex items-center justify-between">
        <span className={value ? 'text-gray-900' : 'text-gray-400 italic'}>
          {value || placeholder || '(not set)'}
        </span>
        <Edit3 className="w-4 h-4 text-gray-300 group-hover:text-violet-400 transition" />
      </div>
    </div>
  );
}

export default function DraftReviewPage() {
  const params = useParams();
  const router = useRouter();
  const draftId = params.id as string;

  const [draft, setDraft] = useState<PanelDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newQuestion, setNewQuestion] = useState('');

  useEffect(() => {
    const fetchDraft = async () => {
      try {
        const res = await fetch(`/api/panels/drafts/${draftId}`);
        if (!res.ok) throw new Error('Draft not found');
        const data = await res.json();
        setDraft(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDraft();
  }, [draftId]);

  const updateField = (field: string, value: any) => {
    if (!draft) return;
    setDraft({ ...draft, [field]: value });
    setEditingField(null);
    setEditValue('');
  };

  const startEdit = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
  };

  const addQuestion = () => {
    if (!newQuestion.trim() || !draft) return;
    setDraft({
      ...draft,
      questions: [...draft.questions, newQuestion.trim()],
    });
    setNewQuestion('');
  };

  const removeQuestion = (index: number) => {
    if (!draft) return;
    setDraft({
      ...draft,
      questions: draft.questions.filter((_, i) => i !== index),
    });
  };

  const publishPanel = async () => {
    if (!draft) return;

    setPublishing(true);
    setError('');

    try {
      const res = await fetch(`/api/panels/${draftId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to publish');
      }

      const result = await res.json();
      router.push(`/panels/${result.panelId}/success`);
    } catch (err: any) {
      setError(err.message);
      setPublishing(false);
    }
  };

  const isValid = draft && draft.name && draft.questions.length >= 1;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-amber-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  if (error && !draft) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Draft Not Found</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!draft) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-amber-50">
      <div className="bg-white/70 backdrop-blur-sm border-b border-violet-100">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-200">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">Review Your Panel</h1>
              <p className="text-sm text-gray-500">
                Make any changes, then create your interviewer
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <EditableField
            label="Panel Name"
            value={draft.name}
            editing={editingField === 'name'}
            editValue={editValue}
            onStartEdit={() => startEdit('name', draft.name)}
            onCancel={() => setEditingField(null)}
            onChange={setEditValue}
            onSave={() => updateField('name', editValue)}
            required
          />

          <EditableField
            label="Description"
            value={draft.description}
            editing={editingField === 'description'}
            editValue={editValue}
            onStartEdit={() => startEdit('description', draft.description)}
            onCancel={() => setEditingField(null)}
            onChange={setEditValue}
            onSave={() => updateField('description', editValue)}
            placeholder="What is this interview panel for?"
          />

          <EditableField
            label="Interview Type"
            value={draft.interview_type}
            editing={editingField === 'interview_type'}
            editValue={editValue}
            onStartEdit={() => startEdit('interview_type', draft.interview_type)}
            onCancel={() => setEditingField(null)}
            onChange={setEditValue}
            onSave={() => updateField('interview_type', editValue)}
            placeholder="e.g., Customer Feedback, Market Research"
          />

          <EditableField
            label="Target Audience"
            value={draft.target_audience}
            editing={editingField === 'target_audience'}
            editValue={editValue}
            onStartEdit={() => startEdit('target_audience', draft.target_audience)}
            onCancel={() => setEditingField(null)}
            onChange={setEditValue}
            onSave={() => updateField('target_audience', editValue)}
            placeholder="Who will be interviewed?"
            icon={Users}
          />

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Tone</label>
            <select
              value={draft.tone}
              onChange={(e) => updateField('tone', e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="casual">Casual</option>
              <option value="formal">Formal</option>
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              Duration
            </label>
            <select
              value={draft.duration_minutes}
              onChange={(e) => updateField('duration_minutes', parseInt(e.target.value))}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value={5}>5 minutes</option>
              <option value={10}>10 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={20}>20 minutes</option>
              <option value={30}>30 minutes</option>
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <label className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              Interview Questions
              <span className="text-red-400">*</span>
              <span className="text-xs text-gray-400 ml-auto">
                {draft.questions.length} question{draft.questions.length !== 1 ? 's' : ''}
              </span>
            </label>

            <ul className="space-y-2 mb-4">
              {draft.questions.map((q, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 bg-gray-50 rounded-xl px-4 py-3 group"
                >
                  <span className="text-violet-400 font-medium text-sm mt-0.5">{i + 1}.</span>
                  <span className="flex-1 text-gray-700">{q}</span>
                  <button
                    onClick={() => removeQuestion(i)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex gap-2">
              <input
                type="text"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addQuestion()}
                placeholder="Add a question..."
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <button
                onClick={addQuestion}
                className="px-4 py-3 bg-violet-100 text-violet-600 rounded-xl hover:bg-violet-200 transition"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <button
            onClick={publishPanel}
            disabled={!isValid || publishing}
            className={`flex-1 flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-semibold text-lg transition-all ${
              isValid && !publishing
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-xl shadow-emerald-200 hover:shadow-2xl hover:scale-[1.02]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {publishing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating Your Panel...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Create Interview Panel
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>

        {!isValid && (
          <p className="text-center text-sm text-amber-600 mt-4">
            Please add a name and at least one question
          </p>
        )}
      </main>
    </div>
  );
}