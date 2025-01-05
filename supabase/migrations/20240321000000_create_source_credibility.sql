create table if not exists public.source_credibility (
    id uuid default gen_random_uuid() primary key,
    domain text not null unique,
    credibility_score decimal(3,2) not null check (credibility_score >= 0 and credibility_score <= 1),
    last_checked timestamp with time zone not null default now(),
    created_at timestamp with time zone not null default now(),
    factors jsonb,
    analysis text,
    constraint valid_domain check (domain ~ '^[a-zA-Z0-9][a-zA-Z0-9-_.]+\.[a-zA-Z]{2,}$')
);

-- Create index for faster domain lookups
create index if not exists source_credibility_domain_idx on public.source_credibility (domain);

-- Add RLS policies
alter table public.source_credibility enable row level security;

create policy "Enable read access for authenticated users"
    on public.source_credibility
    for select
    to authenticated
    using (true);

create policy "Enable insert for authenticated users"
    on public.source_credibility
    for insert
    to authenticated
    with check (true);

create policy "Enable update for authenticated users"
    on public.source_credibility
    for update
    to authenticated
    using (true)
    with check (true);
