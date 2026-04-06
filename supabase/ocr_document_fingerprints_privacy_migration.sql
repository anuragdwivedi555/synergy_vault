alter table if exists public.ocr_document_fingerprints
    drop column if exists normalized_text,
    drop column if exists critical_segments,
    drop column if exists fingerprint_text,
    drop column if exists text_preview,
    drop column if exists filename,
    drop column if exists owner,
    drop column if exists cid,
    drop column if exists tx_hash;

