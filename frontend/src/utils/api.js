const API_BASE = '/api';

export async function checkBackendHealth() {
  try {
    const res = await fetch('/health');
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function startProcessingJob(formData) {
  const response = await fetch(`${API_BASE}/process`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || `Server responded with status ${response.status}`);
  }

  return response.json();
}

export function subscribeToProgress(jobId, onMessage, onError) {
  const eventSource = new EventSource(`${API_BASE}/progress/${jobId}`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (e) {
      console.warn('Failed to parse SSE event data', e);
    }
  };

  eventSource.onerror = (err) => {
    if (onError) onError(err);
  };

  return () => {
    eventSource.close();
  };
}

export async function getJobDetails(jobId) {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`);
  if (!res.ok) throw new Error('Failed to fetch job details');
  return res.json();
}

export function getDownloadUrl(jobId, fileType) {
  return `${API_BASE}/download/${jobId}/${fileType}`;
}
