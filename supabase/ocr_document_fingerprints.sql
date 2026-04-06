create extension if not exists pgcrypto;

create table if not exists public.ocr_document_fingerprints (
    id uuid primary key default gen_random_uuid(),
    content_hash text not null unique,
    extraction_method text not null,
    source_mime_type text,
    file_hash text,
    file_size_bytes bigint,
    document_section text not null default 'personal-document' check (
        document_section in ('property-paper', 'affidavit', 'court-order', 'personal-document')
    ),
    status text not null default 'pending' check (status in ('pending', 'confirmed')),
    expires_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_ocr_document_fingerprints_status
    on public.ocr_document_fingerprints (status);

create index if not exists idx_ocr_document_fingerprints_expires_at
    on public.ocr_document_fingerprints (expires_at);

create index if not exists idx_ocr_document_fingerprints_document_section
    on public.ocr_document_fingerprints (document_section);

create or replace function public.touch_ocr_document_fingerprints_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_touch_ocr_document_fingerprints_updated_at
    on public.ocr_document_fingerprints;

create trigger trg_touch_ocr_document_fingerprints_updated_at
before update on public.ocr_document_fingerprints
for each row
execute function public.touch_ocr_document_fingerprints_updated_at();
