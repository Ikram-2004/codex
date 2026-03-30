import { useState } from 'react';
import { runScan } from './api';

const severityColor = {
  CRITICAL: '#a32d2d',
  HIGH: '#854F0B',
  MEDIUM: '#185FA5',
  INFO: '#444441',
  PASS: '#27500A',
};

const severityBg = {
  CRITICAL: '#fcebeb',
  HIGH: '#faeeda',
  MEDIUM: '#E6F1FB',
  INFO: '#F1EFE8',
  PASS: '#EAF3DE',
};

const gradeColor = {
  A: '#27500A',
  B: '#085041',
  C: '#633806',
  D: '#854F0B',
  F: '#a32d2d',
};

const gradeBg = {
  A: '#EAF3DE',
  B: '#E1F5EE',
  C: '#FAEEDA',
  D: '#FAEEDA',
  F: '#fcebeb',
};

export default function App() {
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [appUrl, setAppUrl] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleScan() {
    if (!websiteUrl && !appUrl && !repoUrl) {
      setError('Please enter at least one URL to scan.');
      return;
    }
    setError('');
    setLoading(true);
    setResults(null);
    try {
      const data = await runScan(websiteUrl, appUrl, repoUrl);
      setResults(data);
    } catch (e) {
      setError('Scan failed. Make sure the backend is running on port 8000.');
    }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 16px', fontFamily: 'sans-serif' }}>
      
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 4 }}>SecurePulse</h1>
      <p style={{ color: '#5F5E5A', marginBottom: 32, fontSize: 15 }}>
        Free security scanner for websites, apps, and codebases
      </p>

      <div style={{ background: '#F1EFE8', borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>
            Website URL
          </label>
          <input
            type="text"
            placeholder="https://example.com"
            value={websiteUrl}
            onChange={e => setWebsiteUrl(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '0.5px solid #B4B2A9', fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>
            App URL (same as website URL if it's a web app)
          </label>
          <input
            type="text"
            placeholder="https://myapp.com"
            value={appUrl}
            onChange={e => setAppUrl(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '0.5px solid #B4B2A9', fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>
            GitHub Repo URL (optional)
          </label>
          <input
            type="text"
            placeholder="https://github.com/username/reponame"
            value={repoUrl}
            onChange={e => setRepoUrl(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '0.5px solid #B4B2A9', fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>

        {error && <p style={{ color: '#a32d2d', fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <button
          onClick={handleScan}
          disabled={loading}
          style={{ background: '#534AB7', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 28px', fontSize: 15, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Scanning... (this takes ~30 seconds)' : 'Run Security Scan'}
        </button>
      </div>

      {results && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, background: gradeBg[results.final.grade], borderRadius: 12, padding: 24, marginBottom: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 56, fontWeight: 700, color: gradeColor[results.final.grade], lineHeight: 1 }}>
                {results.final.grade}
              </div>
              <div style={{ fontSize: 13, color: gradeColor[results.final.grade] }}>
                {results.final.score}/100
              </div>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>Overall Security Score</div>
              <div style={{ fontSize: 14, color: '#5F5E5A' }}>{results.final.message}</div>
            </div>
          </div>




          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 24 }}>
  {[
    { label: 'Website', score: results.scores.website },
    { label: 'Application', score: results.scores.app },
    { label: 'Codebase', score: results.scores.codebase },
  ].map(({ label, score }) => (
    <div key={label} style={{ background: '#F1EFE8', borderRadius: 8, padding: 16, textAlign: 'center' }}>
      <div style={{ fontSize: 12, color: '#5F5E5A', marginBottom: 4 }}>{label}</div>
      {score !== null && score !== undefined ? (
        <>
          <div style={{ fontSize: 24, fontWeight: 600 }}>{score}</div>
          <div style={{ fontSize: 11, color: '#5F5E5A' }}>/ 100</div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 14, color: '#B4B2A9', marginTop: 8 }}>Not scanned</div>
          <div style={{ fontSize: 11, color: '#B4B2A9' }}>—</div>
        </>
      )}
    </div>
  ))}
</div>


          <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12 }}>
            Issues found ({results.findings.filter(f => f.severity !== 'PASS').length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {results.findings
              .filter(f => f.severity !== 'PASS')
              .map((finding, i) => (
                <div key={i} style={{ background: '#fff', border: '0.5px solid #D3D1C7', borderRadius: 10, padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{
                      background: severityBg[finding.severity],
                      color: severityColor[finding.severity],
                      fontSize: 11,
                      fontWeight: 500,
                      padding: '2px 8px',
                      borderRadius: 4,
                      whiteSpace: 'nowrap',
                      marginTop: 2
                    }}>
                      {finding.severity}
                    </span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{finding.title}</div>
                      <div style={{ fontSize: 12, color: '#5F5E5A' }}>
                        <strong>Surface:</strong> {finding.surface} &nbsp;·&nbsp;
                        <strong>Fix:</strong> {finding.fix}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          <h2 style={{ fontSize: 16, fontWeight: 500, margin: '20px 0 12px' }}>
            Passing checks ({results.findings.filter(f => f.severity === 'PASS').length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {results.findings
              .filter(f => f.severity === 'PASS')
              .map((finding, i) => (
                <div key={i} style={{ background: '#EAF3DE', border: '0.5px solid #C0DD97', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#27500A' }}>
                  ✓ {finding.title}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}