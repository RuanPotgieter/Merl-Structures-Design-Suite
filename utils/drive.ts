import { getAccessToken } from './auth';

export const saveProjectToDrive = async (projectData: any, filename: string) => {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google Drive');

  const metadata = {
    name: filename,
    mimeType: 'application/json',
  };

  const fileContent = JSON.stringify(projectData);
  const file = new Blob([fileContent], { type: 'application/json' });

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: form
  });

  if (!res.ok) {
    throw new Error('Failed to save to Google Drive');
  }

  return await res.json();
};

export const updateProjectInDrive = async (fileId: string, projectData: any) => {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google Drive');

  const fileContent = JSON.stringify(projectData);
  const file = new Blob([fileContent], { type: 'application/json' });

  const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: file
  });

  if (!res.ok) {
    throw new Error('Failed to update in Google Drive');
  }

  return await res.json();
};

export const listProjectsFromDrive = async () => {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google Drive');

  const res = await fetch('https://www.googleapis.com/drive/v3/files?q=mimeType="application/json" and trashed=false&fields=files(id,name,modifiedTime)', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    throw new Error('Failed to list files from Google Drive');
  }

  const data = await res.json();
  return data.files;
};

export const getProjectFromDrive = async (fileId: string) => {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google Drive');

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    throw new Error('Failed to download file from Google Drive');
  }

  return await res.json();
};

export const deleteProjectFromDrive = async (fileId: string) => {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google Drive');

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    throw new Error('Failed to delete file from Google Drive');
  }
};
