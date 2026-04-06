create extension if not exists pgcrypto;

create table if not exists public.document_access_grants (
    id uuid primary key default gen_random_uuid(),
    owner_wallet text not null,
    grantee_wallet text not null,
    scope text not null default 'documents',
    status text not null default 'active' check (status in ('active', 'revoked')),
    grant_message text not null,
    grant_signature text not null,
    expires_at timestamptz not null,
    revoked_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (owner_wallet, grantee_wallet, scope)
);

create index if not exists idx_document_access_grants_owner_wallet
    on public.document_access_grants (owner_wallet);

create index if not exists idx_document_access_grants_grantee_wallet
    on public.document_access_grants (grantee_wallet);

create index if not exists idx_document_access_grants_status_expires_at
    on public.document_access_grants (status, expires_at);

create or replace function public.touch_document_access_grants_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_touch_document_access_grants_updated_at
    on public.document_access_grants;

create trigger trg_touch_document_access_grants_updated_at
before update on public.document_access_grants
for each row
execute function public.touch_document_access_grants_updated_at();
