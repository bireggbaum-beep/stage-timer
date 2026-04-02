import { Segment, AirtableTemplate } from '@/types/timer';

const AIRTABLE_PAT = import.meta.env.VITE_AIRTABLE_PAT ?? '';
const AIRTABLE_BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID ?? '';
const AIRTABLE_TABLE_NAME = import.meta.env.VITE_AIRTABLE_TABLE_NAME ?? 'Templates';
const AIRTABLE_API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`;

function headers(): HeadersInit {
  return {
    Authorization: `Bearer ${AIRTABLE_PAT}`,
    'Content-Type': 'application/json',
  };
}

export function isConfigured(): boolean {
  return AIRTABLE_PAT.length > 0 && AIRTABLE_BASE_ID.length > 0;
}

export async function fetchTemplates(): Promise<AirtableTemplate[]> {
  try {
    const url = `${AIRTABLE_API_URL}?sort[0][field]=Name&sort[0][direction]=asc`;
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) throw new Error(`Airtable GET failed: ${res.status}`);
    const data = await res.json();
    return (data.records ?? []).map((rec: Record<string, unknown>) => {
      const fields = rec.fields as Record<string, unknown>;
      let segments: Segment[] = [];
      try {
        segments = JSON.parse((fields.Segments as string) ?? '[]');
      } catch { /* skip invalid JSON */ }
      return {
        id: rec.id as string,
        name: (fields.Name as string) ?? '',
        segments,
        created: (fields.Created as string) ?? '',
      };
    });
  } catch (err) {
    console.error('fetchTemplates:', err);
    return [];
  }
}

export async function saveTemplate(
  name: string,
  segments: Segment[],
): Promise<AirtableTemplate | null> {
  try {
    const existing = await fetchTemplates();
    const match = existing.find(
      (t) => t.name.toLowerCase() === name.toLowerCase(),
    );
    const segmentsJson = JSON.stringify(segments);

    if (match) {
      // Update existing record
      const res = await fetch(`${AIRTABLE_API_URL}/${match.id}`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ fields: { Segments: segmentsJson } }),
      });
      if (!res.ok) throw new Error(`Airtable PATCH failed: ${res.status}`);
      const data = await res.json();
      return {
        id: data.id,
        name: (data.fields.Name as string) ?? name,
        segments,
        created: (data.fields.Created as string) ?? match.created,
      };
    } else {
      // Create new record
      const res = await fetch(AIRTABLE_API_URL, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ fields: { Name: name, Segments: segmentsJson } }),
      });
      if (!res.ok) throw new Error(`Airtable POST failed: ${res.status}`);
      const data = await res.json();
      return {
        id: data.id,
        name: (data.fields.Name as string) ?? name,
        segments,
        created: (data.fields.Created as string) ?? '',
      };
    }
  } catch (err) {
    console.error('saveTemplate:', err);
    return null;
  }
}

export async function deleteTemplate(recordId: string): Promise<boolean> {
  try {
    const res = await fetch(`${AIRTABLE_API_URL}/${recordId}`, {
      method: 'DELETE',
      headers: headers(),
    });
    if (!res.ok) throw new Error(`Airtable DELETE failed: ${res.status}`);
    return true;
  } catch (err) {
    console.error('deleteTemplate:', err);
    return false;
  }
}
