// app/panels/drafts/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Loader2, CheckCircle, AlertCircle, Edit3, Save, X,
  MessageSquare, Clock, Users, Sparkles, ArrowRight, Plus, Trash2
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

export default function DraftReviewPage() {
  const params = useParams();
  const router = useRouter();
  const draftId = params.id as string;

  const [draft, setDraft] = useState<PanelDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  // Edit states
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newQuestion, setNewQuestion] = useState('');

  useEffect(() => {
    fetchDraft();
  }, [draftId]);

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
      questions: [...draft.questions, newQuestion.trim()]
    });
    setNewQuestion('');
  };

  const removeQuestion = (index: number) => {
    if (!draft) return;
    setDraft({
      ...draft,
      questions: draft.questions.filter((_, i) => i !== index)
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

  const isValid = draft &&
    draft.name &&
    draft.questions.length >= 1;

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
      {/* Header */}
      <div className="bg-white/70 backdrop-blur-sm border-b border-violet-100">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-200">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">Review Your Panel</h1>
              <p className="text-sm text-gray-500">Make any changes, then create your interviewer</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Panel Name */}
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

          {/* Description */}
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

          {/* Interview Type */}
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

          {/* Target Audience */}
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

          {/* Tone */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Tone</label>
            <select
              value={draft.tone}