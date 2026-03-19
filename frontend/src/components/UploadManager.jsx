import { useEffect, useMemo, useState } from 'react';

const initialMetadata = {
  employeeName: '',
  department: '',
  jurisdiction: '',
  documentType: '',
  expirationDate: ''
};

const OFFLINE_QUEUE_KEY = 'offline_upload_queue';

function VerificationBadge({ status }) {
  if (status === 'verified') {
    return <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800">🔒 Verified</span>;
  }

  return <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">⚠️ Needs Review</span>;
}

function readQueue() {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeQueue(items) {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(items));
}

export default function UploadManager() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [metadata, setMetadata] = useState(initialMetadata);
  const [uploadResult, setUploadResult] = useState(null);
  const [status, setStatus] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [documents, setDocuments] = useState([]);

  const preview = useMemo(() => {
    if (!selectedFile) return null;

    return {
      name: selectedFile.name,
      type: selectedFile.type || 'Unknown type',
      sizeKb: `${(selectedFile.size / 1024).toFixed(2)} KB`
    };
  }, [selectedFile]);

  useEffect(() => {
    async function syncOfflineQueue() {
      const queue = readQueue();
      if (!navigator.onLine || queue.length === 0) return;

      const token = sessionStorage.getItem('auth_token');
      const remaining = [];

      for (const item of queue) {
        const formData = new FormData();
        formData.append('file', new File([new Uint8Array(item.fileBytes)], item.fileName, { type: item.fileType }));
        Object.entries(item.metadata).forEach(([key, value]) => formData.append(key, value));

        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          credentials: 'include',
          body: formData
        });

        if (!response.ok) {
          remaining.push(item);
        }
      }

      writeQueue(remaining);
      if (remaining.length === 0) {
        setStatus('Offline captures synced successfully.');
        fetchDocuments();
      }
    }

    window.addEventListener('online', syncOfflineQueue);
    syncOfflineQueue();

    return () => window.removeEventListener('online', syncOfflineQueue);
  }, []);

  function updateMetadata(field, value) {
    setMetadata((prev) => ({ ...prev, [field]: value }));
  }

  function onFilePicked(file) {
    if (!file) return;
    setSelectedFile(file);
    setUploadResult(null);
    setStatus('File selected. Add metadata and upload.');
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    onFilePicked(event.dataTransfer.files?.[0]);
  }

  async function fetchDocuments() {
    const token = sessionStorage.getItem('auth_token');
    const response = await fetch('/api/documents', {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      credentials: 'include'
    });

    const payload = await response.json().catch(() => ({}));
    if (response.ok) {
      setDocuments(payload.documents || []);
    }
  }

  async function enqueueOfflineUpload(file) {
    const bytes = Array.from(new Uint8Array(await file.arrayBuffer()));
    const queue = readQueue();
    queue.push({ fileName: file.name, fileType: file.type, fileBytes: bytes, metadata, createdAt: new Date().toISOString() });
    writeQueue(queue);
    setStatus('Offline capture saved. It will sync automatically when online.');
  }

  async function handleUpload() {
    if (!selectedFile) {
      setStatus('Please select a file before uploading.');
      return;
    }

    if (!navigator.onLine) {
      await enqueueOfflineUpload(selectedFile);
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    Object.entries(metadata).forEach(([key, value]) => formData.append(key, value));

    const token = sessionStorage.getItem('auth_token');

    setStatus('Uploading...');
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      credentials: 'include',
      body: formData
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(payload.message || 'Upload failed.');
      return;
    }

    setUploadResult(payload);
    setStatus(`Uploaded successfully. File ID: ${payload.fileId}`);
    await fetchDocuments();
  }

  async function handleVerifyAndTimestamp(fileId) {
    const targetFileId = fileId || uploadResult?.fileId;
    if (!targetFileId) {
      setStatus('Upload a file first to verify and timestamp it.');
      return;
    }

    const token = sessionStorage.getItem('auth_token');
    setStatus('Verifying and timestamping...');

    const response = await fetch('/api/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      credentials: 'include',
      body: JSON.stringify({ fileId: targetFileId, useThirdParty: false })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(payload.message || 'Verification failed.');
      return;
    }

    setStatus(`${payload.message} Timestamp: ${payload.verification?.verifiedAt || 'N/A'}`);
    await fetchDocuments();
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm" aria-label="Document upload and security controls">
      <h3 className="text-xl font-semibold text-slate-900">Document Upload & Categorization</h3>
      <p className="mt-1 text-sm text-slate-600">Plain-language tip: add employee details, then upload and verify.</p>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`mt-4 rounded-lg border-2 border-dashed p-6 text-center ${
          isDragging ? 'border-brandBlue bg-blue-50' : 'border-slate-300 bg-slate-50'
        }`}
      >
        <p className="text-sm text-slate-700">Drop file here</p>
        <p className="my-2 text-xs text-slate-500">or</p>
        <label className="cursor-pointer rounded-md bg-brandBlue px-3 py-2 text-sm font-semibold text-white" title="Choose a document from your device">
          Browse Files
          <input type="file" className="hidden" onChange={(event) => onFilePicked(event.target.files?.[0])} aria-label="Browse files" />
        </label>
      </div>

      {preview ? (
        <div className="mt-4 rounded-md bg-slate-100 p-3 text-sm">
          <p className="font-medium text-slate-800">Selected File Preview</p>
          <p>Name: {preview.name}</p>
          <p>Type: {preview.type}</p>
          <p>Size: {preview.sizeKb}</p>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {Object.keys(initialMetadata).map((field) => (
          <input
            key={field}
            type={field === 'expirationDate' ? 'date' : 'text'}
            placeholder={field.replace(/([A-Z])/g, ' $1')}
            value={metadata[field]}
            onChange={(event) => updateMetadata(field, event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            aria-label={field}
          />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={handleUpload} className="rounded-md bg-brandBlue px-4 py-2 text-sm font-semibold text-white" title="Upload now or store offline when disconnected">
          Upload Document
        </button>
        <button onClick={() => handleVerifyAndTimestamp()} className="rounded-md bg-brandRed px-4 py-2 text-sm font-semibold text-white" title="Run verification and timestamp action">
          Verify & Timestamp
        </button>
        <button onClick={fetchDocuments} className="rounded-md bg-slate-700 px-4 py-2 text-sm font-semibold text-white" title="Refresh document list">
          Refresh Documents
        </button>
      </div>

      {status ? <p className="mt-3 text-sm text-slate-700" role="status">{status}</p> : null}

      {uploadResult ? (
        <pre className="mt-3 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">{JSON.stringify(uploadResult, null, 2)}</pre>
      ) : null}

      <div className="mt-5 space-y-3">
        {documents.map((doc) => (
          <div key={doc.id} className="rounded-lg border border-slate-200 p-3 text-sm">
            <div className="flex items-center justify-between">
              <p className="font-medium text-slate-800">{doc.storage?.originalName || doc.id}</p>
              <VerificationBadge status={doc.verification?.status} />
            </div>
            <p className="text-slate-600">SHA-256: {doc.verification?.hash}</p>
            <p className="text-slate-600">Timestamp: {doc.verification?.verifiedAt || 'Pending verification'}</p>
            <p className="text-slate-600">Expires: {doc.metadata?.expirationDate || 'Not set'}</p>
            <p className="text-slate-600">Versions: {(doc.versions || []).length}</p>
            <p className="text-slate-600">Audit entries: {doc.auditTrail?.length || 0}</p>
            <button onClick={() => handleVerifyAndTimestamp(doc.id)} className="mt-2 rounded-md bg-brandRed px-3 py-1.5 text-xs font-semibold text-white" title="Verify this specific document">
              Verify & Timestamp
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
