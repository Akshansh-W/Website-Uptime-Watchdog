import React, { useState } from 'react';
import './AddApiCheck.css';

const ASSERT_TYPES = [
  { value: 'status_code',       label: 'Status code equals',      placeholder: '200',            hint: 'e.g. 200, 201, 404' },
  { value: 'body_contains',     label: 'Response body contains',  placeholder: '"success"',      hint: 'Any string in the response' },
  { value: 'body_json_field',   label: 'JSON field equals',       placeholder: 'active',         hint: 'Use dot-path below, e.g. data.status' },
  { value: 'response_time_lt',  label: 'Response time under (ms)',placeholder: '1000',           hint: 'Fails if slower than this' },
];

function emptyTestCase() {
  return { description: '', assert_type: 'status_code', expected_value: '', json_path: '' };
}

export default function AddApiCheck({ monitorId, onSave, onCancel }) {
  const [form, setForm] = useState({
    label:   '',
    url:     '',
    method:  'GET',
    headers: '',   // raw JSON string
    body:    '',   // raw JSON string
  });
  const [testCases, setTestCases] = useState([emptyTestCase()]);
  const [errors, setErrors]       = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading]     = useState(false);
  const [showHeaders, setShowHeaders] = useState(false);

  const setField = (field) => (e) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const updateTC = (i, field, value) =>
    setTestCases(prev => prev.map((tc, idx) => idx === i ? { ...tc, [field]: value } : tc));

  const addTC = () => setTestCases(prev => [...prev, emptyTestCase()]);
  const removeTC = (i) => setTestCases(prev => prev.filter((_, idx) => idx !== i));

  const validate = () => {
    const e = {};
    if (!form.label.trim()) e.label = 'Name is required';
    if (!form.url.trim()) e.url = 'URL is required';
    else { try { new URL(form.url); } catch { e.url = 'Invalid URL'; } }

    if (form.headers) {
      try { JSON.parse(form.headers); } catch { e.headers = 'Must be valid JSON'; }
    }
    if (form.body && ['POST','PUT','PATCH'].includes(form.method)) {
      try { JSON.parse(form.body); } catch { e.body = 'Must be valid JSON'; }
    }

    testCases.forEach((tc, i) => {
      if (!tc.description.trim()) e[`tc_desc_${i}`] = 'Description required';
      if (!tc.expected_value.trim()) e[`tc_val_${i}`] = 'Expected value required';
      if (tc.assert_type === 'body_json_field' && !tc.json_path.trim())
        e[`tc_path_${i}`] = 'JSON path required';
    });

    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    setLoading(true);
    setServerError('');
    try {
      await onSave({
        label:   form.label,
        url:     form.url,
        method:  form.method,
        headers: form.headers ? JSON.parse(form.headers) : null,
        body:    form.body    ? JSON.parse(form.body)    : null,
        testCases: testCases.map(tc => ({
          description:    tc.description,
          assert_type:    tc.assert_type,
          expected_value: tc.expected_value,
          json_path:      tc.json_path || null,
        })),
      });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const needsBody = ['POST', 'PUT', 'PATCH'].includes(form.method);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal-box">
        <div className="modal-header">
          <h2>Add API Check</h2>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>

        {serverError && <div className="modal-server-error">{serverError}</div>}

        <div className="modal-body">

          {/* ── Endpoint ── */}
          <div className="modal-section">
            <div className="modal-section-label">Endpoint</div>

            <div className={`mfield ${errors.label ? 'err' : ''}`}>
              <label>Name</label>
              <input type="text" placeholder="Login API" value={form.label} onChange={setField('label')} />
              {errors.label && <span className="merror">{errors.label}</span>}
            </div>

            <div className="mfield-row">
              <div className="method-select-wrap">
                <label>Method</label>
                <select value={form.method} onChange={setField('method')} className="method-select">
                  {['GET','POST','PUT','PATCH','DELETE'].map(m => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className={`mfield flex1 ${errors.url ? 'err' : ''}`}>
                <label>URL</label>
                <input type="text" placeholder="https://api.example.com/health" value={form.url} onChange={setField('url')} />
                {errors.url && <span className="merror">{errors.url}</span>}
              </div>
            </div>

            <button className="toggle-btn" onClick={() => setShowHeaders(h => !h)}>
              {showHeaders ? '▾' : '▸'} Headers (optional)
            </button>

            {showHeaders && (
              <div className={`mfield ${errors.headers ? 'err' : ''}`}>
                <label>Headers (JSON)</label>
                <textarea
                  placeholder={'{\n  "Authorization": "Bearer your_token"\n}'}
                  value={form.headers}
                  onChange={setField('headers')}
                  rows={4}
                />
                {errors.headers && <span className="merror">{errors.headers}</span>}
              </div>
            )}

            {needsBody && (
              <div className={`mfield ${errors.body ? 'err' : ''}`}>
                <label>Request Body (JSON)</label>
                <textarea
                  placeholder={'{\n  "username": "test@example.com",\n  "password": "testpass"\n}'}
                  value={form.body}
                  onChange={setField('body')}
                  rows={5}
                />
                {errors.body && <span className="merror">{errors.body}</span>}
              </div>
            )}
          </div>

          {/* ── Test Cases ── */}
          <div className="modal-section">
            <div className="modal-section-label">
              Test Cases
              <span className="tc-count">{testCases.length} assertion{testCases.length !== 1 ? 's' : ''}</span>
            </div>

            {testCases.map((tc, i) => (
              <div className="tc-card" key={i}>
                <div className="tc-header">
                  <span className="tc-num">#{i + 1}</span>
                  {testCases.length > 1 && (
                    <button className="tc-remove" onClick={() => removeTC(i)}>✕</button>
                  )}
                </div>

                <div className={`mfield ${errors[`tc_desc_${i}`] ? 'err' : ''}`}>
                  <label>Description</label>
                  <input
                    type="text"
                    placeholder="Returns 200 OK"
                    value={tc.description}
                    onChange={e => updateTC(i, 'description', e.target.value)}
                  />
                  {errors[`tc_desc_${i}`] && <span className="merror">{errors[`tc_desc_${i}`]}</span>}
                </div>

                <div className="mfield">
                  <label>Assertion type</label>
                  <select
                    value={tc.assert_type}
                    onChange={e => updateTC(i, 'assert_type', e.target.value)}
                    className="method-select"
                  >
                    {ASSERT_TYPES.map(a => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                  <span className="field-hint">
                    {ASSERT_TYPES.find(a => a.value === tc.assert_type)?.hint}
                  </span>
                </div>

                {tc.assert_type === 'body_json_field' && (
                  <div className={`mfield ${errors[`tc_path_${i}`] ? 'err' : ''}`}>
                    <label>JSON path</label>
                    <input
                      type="text"
                      placeholder="data.status"
                      value={tc.json_path}
                      onChange={e => updateTC(i, 'json_path', e.target.value)}
                    />
                    {errors[`tc_path_${i}`] && <span className="merror">{errors[`tc_path_${i}`]}</span>}
                  </div>
                )}

                <div className={`mfield ${errors[`tc_val_${i}`] ? 'err' : ''}`}>
                  <label>Expected value</label>
                  <input
                    type="text"
                    placeholder={ASSERT_TYPES.find(a => a.value === tc.assert_type)?.placeholder}
                    value={tc.expected_value}
                    onChange={e => updateTC(i, 'expected_value', e.target.value)}
                  />
                  {errors[`tc_val_${i}`] && <span className="merror">{errors[`tc_val_${i}`]}</span>}
                </div>
              </div>
            ))}

            <button className="add-tc-btn" onClick={addTC}>+ Add assertion</button>
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-cancel" onClick={onCancel} disabled={loading}>Cancel</button>
          <button className="modal-save" onClick={handleSave} disabled={loading}>
            {loading ? <span className="modal-spinner" /> : 'Save & Run →'}
          </button>
        </div>
      </div>
    </div>
  );
}
