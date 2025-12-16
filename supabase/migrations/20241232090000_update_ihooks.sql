create table if not exists elevenlabs_conversations (
  id uuid primary key default gen_random_uuid(),

  conversation_id text not null,
  agent_id text not null,

  started_at timestamptz not null,
  ended_at timestamptz,

  transcript jsonb not null,

  created_at timestamptz not null default now()
);
