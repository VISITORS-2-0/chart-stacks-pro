export interface Group {
  _id: string;
  name: string;
  patientIds: string[];
}

const API_BASE_URL = '/api/groups';

export async function fetchGroups(): Promise<Group[]> {
  const response = await fetch(API_BASE_URL);
  if (!response.ok) {
    throw new Error('Failed to fetch groups');
  }
  return response.json();
}

export async function createGroup(name: string, patientIds: string[]): Promise<Group> {
  const response = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, patientIds }),
  });
  if (!response.ok) {
    throw new Error('Failed to create group');
  }
  return response.json();
}

export async function updateGroup(id: string, name: string, patientIds: string[]): Promise<void> {
  const response = await fetch(API_BASE_URL, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id, name, patientIds }),
  });
  if (!response.ok) {
    throw new Error('Failed to update group');
  }
}

export async function deleteGroup(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}?id=${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete group');
  }
}
