alter table if exists public.ocr_document_fingerprints
    add column if not exists document_section text;

update public.ocr_document_fingerprints
set document_section = 'personal-document'
where document_section is null;

alter table public.ocr_document_fingerprints
    alter column document_section set default 'personal-document',
    alter column document_section set not null;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'ocr_document_fingerprints_document_section_check'
    ) then
        alter table public.ocr_document_fingerprints
            add constraint ocr_document_fingerprints_document_section_check
            check (document_section in ('property-paper', 'affidavit', 'court-order', 'personal-document'));
    end if;
end;
$$;

create index if not exists idx_ocr_document_fingerprints_document_section
    on public.ocr_document_fingerprints (document_section);
