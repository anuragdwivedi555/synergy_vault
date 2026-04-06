export type DocumentSection =
    | 'property-paper'
    | 'affidavit'
    | 'court-order'
    | 'personal-document';

export const DOCUMENT_SECTION_OPTIONS: Array<{
    value: DocumentSection;
    label: string;
    description: string;
    icon: string;
}> = [
    {
        value: 'property-paper',
        label: 'Property Paper',
        description: 'Sale deeds, registration papers, land records, and ownership files.',
        icon: '🏠',
    },
    {
        value: 'affidavit',
        label: 'Affidavit',
        description: 'Sworn statements, declarations, and legally signed affidavits.',
        icon: '🖋️',
    },
    {
        value: 'court-order',
        label: 'Court Orders',
        description: 'Judgments, notices, orders, and court-issued record copies.',
        icon: '⚖️',
    },
    {
        value: 'personal-document',
        label: 'Personal Documents',
        description: 'Identity records and other individual legal or supporting documents.',
        icon: '🪪',
    },
];

const DOCUMENT_SECTION_LABELS = new Map(
    DOCUMENT_SECTION_OPTIONS.map((option) => [option.value, option.label])
);

export function isDocumentSection(value: string | null | undefined): value is DocumentSection {
    return DOCUMENT_SECTION_LABELS.has((value || '') as DocumentSection);
}

export function getDocumentSectionLabel(value: string | null | undefined): string {
    if (!value) return 'Unclassified';
    return DOCUMENT_SECTION_LABELS.get(value as DocumentSection) || 'Unclassified';
}
