const templates = {
  us_i9: {
    title: 'US I-9 Compliance Report',
    requiredDocTypes: ['I-9 Form', 'Identity Proof', 'Work Authorization']
  },
  ca_work_permit: {
    title: 'Canadian Work Permit Compliance Report',
    requiredDocTypes: ['Work Permit', 'Passport', 'Employer Letter']
  },
  cross_border: {
    title: 'Cross-Border Compliance Report',
    requiredDocTypes: ['Data Transfer Agreement', 'Jurisdiction Notice', 'Retention Policy']
  }
};

function filterByUser(documents, userId) {
  return documents.filter((doc) => doc.ownerId === userId);
}

function summarizeDocuments(docs, templateKey) {
  const template = templates[templateKey] || templates.cross_border;

  return docs.map((doc) => ({
    documentId: doc.id,
    fileName: doc.storage?.originalName || doc.id,
    employeeName: doc.metadata?.employeeName || '',
    department: doc.metadata?.department || '',
    jurisdiction: doc.metadata?.jurisdiction || '',
    documentType: doc.metadata?.documentType || '',
    expirationDate: doc.metadata?.expirationDate || '',
    uploadedAt: doc.uploadedAt,
    verificationStatus: doc.verification?.status || 'needs_review',
    verifiedAt: doc.verification?.verifiedAt || '',
    hash: doc.verification?.hash || '',
    auditLogCount: (doc.auditTrail || []).length,
    templateTitle: template.title
  }));
}

function toCsv(rows) {
  const headers = Object.keys(rows[0] || {});
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.join(',')];

  rows.forEach((row) => {
    lines.push(headers.map((key) => escape(row[key])).join(','));
  });

  return lines.join('\n');
}

function toTextReport(rows, template) {
  const lines = [
    `Report Template: ${template.title}`,
    `Generated At: ${new Date().toISOString()}`,
    `Required Document Types: ${template.requiredDocTypes.join(', ')}`,
    '',
    'Document Entries:'
  ];

  rows.forEach((row, index) => {
    lines.push(
      `${index + 1}. ${row.fileName}`,
      `   Employee: ${row.employeeName}`,
      `   Department: ${row.department}`,
      `   Jurisdiction: ${row.jurisdiction}`,
      `   Type: ${row.documentType}`,
      `   Uploaded: ${row.uploadedAt}`,
      `   Verification: ${row.verificationStatus} (${row.verifiedAt || 'pending'})`,
      `   Hash: ${row.hash}`,
      `   Audit Logs: ${row.auditLogCount}`,
      ''
    );
  });

  return lines.join('\n');
}

export function listReportTemplates() {
  return Object.entries(templates).map(([key, value]) => ({
    key,
    ...value
  }));
}

export function generateReportPayload({ documents, userId, templateKey, format }) {
  const userDocs = filterByUser(documents, userId);
  const template = templates[templateKey] || templates.cross_border;
  const rows = summarizeDocuments(userDocs, templateKey);

  if (format === 'csv') {
    return {
      mimeType: 'text/csv',
      extension: 'csv',
      content: toCsv(rows)
    };
  }

  if (format === 'excel') {
    // Excel placeholder export uses CSV content with Excel MIME type.
    return {
      mimeType: 'application/vnd.ms-excel',
      extension: 'xls',
      content: toCsv(rows)
    };
  }

  // PDF placeholder export uses plain text content wrapped as PDF mime for scaffold flow.
  return {
    mimeType: 'application/pdf',
    extension: 'pdf',
    content: toTextReport(rows, template)
  };
}
