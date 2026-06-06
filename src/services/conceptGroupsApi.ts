export interface ConceptValue {
  concept: string;
  value?: string;
  min?: number;
  max?: number;
}

export interface ConceptGroup {
  _id: string;
  name: string;
  concepts: ConceptValue[];
}

const API_BASE_URL = '/api/concept-groups';

export async function fetchConceptGroups(): Promise<ConceptGroup[]> {
  const response = await fetch(API_BASE_URL);
  if (!response.ok) {
    throw new Error('Failed to fetch concept groups');
  }
  return response.json();
}

export async function createConceptGroup(name: string, concepts: ConceptValue[]): Promise<ConceptGroup> {
  const response = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, concepts }),
  });
  if (!response.ok) {
    throw new Error('Failed to create concept group');
  }
  return response.json();
}

export async function updateConceptGroup(id: string, name: string, concepts: ConceptValue[]): Promise<void> {
  const response = await fetch(API_BASE_URL, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id, name, concepts }),
  });
  if (!response.ok) {
    throw new Error('Failed to update concept group');
  }
}

export async function deleteConceptGroup(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}?id=${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete concept group');
  }
}
