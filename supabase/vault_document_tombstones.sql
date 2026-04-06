create extension if not exists pgcrypto;

create table if not exists public.vault_document_tombstones (
    id uuid primary key default gen_random_uuid(),
    owner_wallet text not null,
    file_hash text not null,
    deleted_by text not null,
    deleted_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (owner_wallet, file_hash)
);

create index if not exists idx_vault_document_tombstones_owner_wallet
    on public.vault_document_tombstones (owner_wallet);

create index if not exists idx_vault_document_tombstones_file_hash
    on public.vault_document_tombstones (file_hash);

create or replace function public.touch_vault_document_tombstones_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_touch_vault_document_tombstones_updated_at
    on public.vault_document_tombstones;

create trigger trg_touch_vault_document_tombstones_updated_at
before update on public.vault_document_tombstones
for each row
execute function public.touch_vault_document_tombstones_updated_at();
