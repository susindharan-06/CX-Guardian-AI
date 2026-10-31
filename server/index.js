// server/index.js
// Autonomous Customer Experience Recovery Platform - Enterprise Server
// Zero external npm dependencies required - runs natively on Node.js v18+

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { db } = require('./database');
const { analyzeSentiment } = require('./ai_engine');

const PORT = process.env.PORT || 5173;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// MIME types for static assets
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.csv': 'text/csv; charset=utf-8'
};

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      // Guard against huge payload
      if (body.length > 25 * 1024 * 1024) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      resolve(body);
    });
    req.on('error', err => reject(err));
  });
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  // -------------------------------------------------------------
  // REST API ROUTING
  // -------------------------------------------------------------

  try {
    // 1. Overview Stats
    if (req.method === 'GET' && pathname === '/api/stats') {
      const stats = db.getOverviewStats();
      const issues = db.get('detected_issues');
      const feedback = db.get('feedback');
      const kpis = db.get('kpi_metrics');

      // Category breakdown for chart
      const categories = {};
      feedback.forEach(f => {
        const cat = f.assigned_category || f.category || 'Product Quality';
        categories[cat] = (categories[cat] || 0) + 1;
      });

      // Sentiment breakdown
      const sentiments = { Positive: 0, Neutral: 0, Negative: 0 };
      feedback.forEach(f => {
        const s = f.raw_sentiment || f.sentiment || 'Neutral';
        sentiments[s] = (sentiments[s] || 0) + 1;
      });

      return sendJSON(res, 200, {
        stats,
        issues: issues.slice(0, 5),
        categoryDistribution: Object.entries(categories).map(([k, v]) => ({ name: k, count: v })),
        sentimentDistribution: sentiments,
        dailyVelocity: kpis.dailyTrends || [],
        autonomousChain: [
          { step: 1, name: 'Feedback Ingestion', status: 'Completed', detail: `${stats.totalFeedback} records indexed` },
          { step: 2, name: 'Sentiment & Polarity Scoring', status: 'Completed', detail: `${stats.negativeFeedback} negative signals isolated` },
          { step: 3, name: 'NLP Category Mapping', status: 'Completed', detail: '6 operational categories tagged' },
          { step: 4, name: 'TF-IDF & KMeans Clustering', status: 'Completed', detail: `${stats.detectedIssuesCount} emerging patterns grouped` },
          { step: 5, name: 'Evidence-Based Root Cause', status: 'Completed', detail: 'Correlated carrier SLA & QA logs' },
          { step: 6, name: 'Autonomous Recovery Plans', status: 'In Action', detail: `${stats.recoveryActionsCount} SOPs generated with department routing` },
          { step: 7, name: 'Outcome KPI Monitoring', status: 'Active', detail: 'Continuous verification active' }
        ]
      });
    }

    // 2. Feedback GET (Search, Multi-Filter, Pagination)
    if (req.method === 'GET' && pathname === '/api/feedback') {
      let records = db.get('feedback');

      // Search text
      if (query.search) {
        const q = query.search.toLowerCase();
        records = records.filter(r =>
          r.feedback_text.toLowerCase().includes(q) ||
          r.customer_id.toLowerCase().includes(q) ||
          (r.location && r.location.toLowerCase().includes(q)) ||
          (r.product && r.product.toLowerCase().includes(q)) ||
          (r.delivery_partner && r.delivery_partner.toLowerCase().includes(q))
        );
      }

      // Filter: Sentiment
      if (query.sentiment && query.sentiment !== 'All') {
        records = records.filter(r => (r.raw_sentiment || r.sentiment) === query.sentiment);
      }

      // Filter: Category
      if (query.category && query.category !== 'All') {
        records = records.filter(r => (r.assigned_category || r.category) === query.category);
      }

      // Filter: Location
      if (query.location && query.location !== 'All') {
        records = records.filter(r => r.location === query.location);
      }

      // Filter: Product
      if (query.product && query.product !== 'All') {
        records = records.filter(r => r.product === query.product);
      }

      // Filter: Source
      if (query.source && query.source !== 'All') {
        records = records.filter(r => r.source === query.source);
      }

      const totalFiltered = records.length;
      const page = parseInt(query.page) || 1;
      const limit = parseInt(query.limit) || 25;
      const paginated = records.slice((page - 1) * limit, page * limit);

      return sendJSON(res, 200, {
        records: paginated,
        total: totalFiltered,
        page,
        limit,
        totalPages: Math.ceil(totalFiltered / limit)
      });
    }

    // 3. Feedback POST (Add manual record)
    if (req.method === 'POST' && pathname === '/api/feedback') {
      const raw = await parseBody(req);
      const data = JSON.parse(raw);
      if (!data.feedback_text || data.feedback_text.trim() === '') {
        return sendJSON(res, 400, { error: 'Feedback text is required' });
      }
      const newRecord = db.addFeedback(data);
      // Automatically re-run analysis to incorporate new feedback
      db.runAnalysis();
      return sendJSON(res, 201, { success: true, record: newRecord });
    }

    // 4. Feedback DELETE
    if (req.method === 'DELETE' && pathname.startsWith('/api/feedback/')) {
      const id = pathname.replace('/api/feedback/', '');
      const deleted = db.deleteFeedback(id);
      if (deleted) {
        db.runAnalysis();
        return sendJSON(res, 200, { success: true, message: `Feedback ${id} deleted` });
      } else {
        return sendJSON(res, 404, { error: 'Feedback record not found' });
      }
    }

    // 5. Seed Demo Data
    if (req.method === 'POST' && pathname === '/api/feedback/seed') {
      const count = db.seedDemoData();
      return sendJSON(res, 200, { success: true, count, message: `Seeded ${count} demo records labeled [DEMO DATA]` });
    }

    // 6. Download Sample CSV
    if (req.method === 'GET' && pathname === '/api/feedback/sample-csv') {
      const sampleCsv = `customer_id,feedback_id,feedback_text,rating,product,location,source,date,order_id,transaction_id,delivery_partner,order_status,refund_status
CUST-1042,FB-SAMPLE-1,"[DEMO DATA] Package delayed by 5 days in Chennai. Tracking says out for delivery but ExpressLogistics agent never arrived.",1,SmartHome Hub Pro,Chennai,Customer Reviews,2026-10-28,ORD-2026-10294,TXN-9482910,ExpressLogistics,In Transit - Delayed,None
CUST-1190,FB-SAMPLE-2,"[DEMO DATA] UPI deduction completed but order failed. Refund not initiated after 6 business days.",1,Smart Air Purifier X1,Bangalore,Support Tickets,2026-10-27,ORD-2026-44910,TXN-3829104,BlueDart Express,Failed,Processing Overdue
CUST-1345,FB-SAMPLE-3,"[DEMO DATA] PM2.5 sensor continuously blinking 999 AQI. Device rattles on sleep mode.",1,Smart Air Purifier X1,Mumbai,Social Media,2026-10-25,ORD-2026-78291,TXN-2849102,Delhivery Prime,Delivered,Return Requested
CUST-1402,FB-SAMPLE-4,"[DEMO DATA] Excellent build quality and super fast delivery within 24 hours in Delhi.",5,UltraSound ANC Headphones,Delhi,Customer Reviews,2026-10-29,ORD-2026-94812,TXN-1928472,BlueDart Express,Delivered,None
CUST-1588,FB-SAMPLE-5,"[DEMO DATA] Standard product. Setup took a little longer than expected but works fine.",3,4K Security Camera 360,Hyderabad,Customer Surveys,2026-10-26,ORD-2026-58193,TXN-8472910,Shadowfax Logistics,Delivered,None`;

      res.writeHead(200, {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="cx_guardian_sample_feedback.csv"'
      });
      return res.end(sampleCsv);
    }

    // 7. CSV Upload with Validation
    if (req.method === 'POST' && pathname === '/api/feedback/upload-csv') {
      const raw = await parseBody(req);
      if (!raw || raw.trim().length === 0) {
        return sendJSON(res, 400, { error: 'Empty CSV file uploaded' });
      }

      // Basic CSV parser
      const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        return sendJSON(res, 400, { error: 'CSV file must contain a header row and at least one data row' });
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
      const requiredFields = ['feedback_text'];
      const missing = requiredFields.filter(f => !headers.includes(f));
      if (missing.length > 0) {
        return sendJSON(res, 400, { error: `Missing required column(s): ${missing.join(', ')}. Please refer to the sample CSV.` });
      }

      const textIdx = headers.indexOf('feedback_text');
      const ratingIdx = headers.indexOf('rating');
      const prodIdx = headers.indexOf('product');
      const locIdx = headers.indexOf('location');
      const srcIdx = headers.indexOf('source');
      const custIdx = headers.indexOf('customer_id');
      const carrierIdx = headers.indexOf('delivery_partner');

      let parsedCount = 0;
      const records = db.get('feedback');

      for (let i = 1; i < lines.length; i++) {
        // Handle comma-in-quotes basic regex
        const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
        if (row && row[textIdx]) {
          const text = row[textIdx].replace(/^["']|["']$/g, '').trim();
          if (text) {
            records.unshift({
              feedback_id: `FB-${String(records.length + 1).padStart(5, '0')}`,
              customer_id: custIdx !== -1 && row[custIdx] ? row[custIdx].replace(/^["']|["']$/g, '') : `CUST-${Math.floor(Math.random() * 900) + 100}`,
              customer_tier: 'Regular',
              feedback_text: text,
              rating: ratingIdx !== -1 && row[ratingIdx] ? Number(row[ratingIdx].replace(/^["']|["']$/g, '')) || 3 : 3,
              product: prodIdx !== -1 && row[prodIdx] ? row[prodIdx].replace(/^["']|["']$/g, '') : 'SmartHome Hub Pro',
              location: locIdx !== -1 && row[locIdx] ? row[locIdx].replace(/^["']|["']$/g, '') : 'Chennai',
              source: srcIdx !== -1 && row[srcIdx] ? row[srcIdx].replace(/^["']|["']$/g, '') : 'Customer Reviews',
              date: new Date().toISOString().split('T')[0],
              order_id: `ORD-2026-${Math.floor(Math.random() * 90000) + 10000}`,
              transaction_id: `TXN-${Math.floor(Math.random() * 9000000) + 1000000}`,
              delivery_partner: carrierIdx !== -1 && row[carrierIdx] ? row[carrierIdx].replace(/^["']|["']$/g, '') : 'ExpressLogistics',
              order_status: 'Delivered',
              refund_status: 'None',
              created_at: new Date().toISOString()
            });
            parsedCount++;
          }
        }
      }

      db.set('feedback', records);
      db.runAnalysis();
      return sendJSON(res, 200, { success: true, count: parsedCount, message: `Successfully validated and imported ${parsedCount} feedback records.` });
    }

    // 8. Run Full CX Analysis Pipeline
    if (req.method === 'POST' && pathname === '/api/analysis/run') {
      const result = db.runAnalysis();
      return sendJSON(res, 200, {
        success: true,
        summary: result.summary,
        issuesCount: result.issues.length,
        interventionsCount: result.interventions.length,
        timestamp: new Date().toISOString()
      });
    }

    // 9. Detected Issues
    if (req.method === 'GET' && pathname === '/api/issues') {
      let issues = db.get('detected_issues');

      if (query.severity && query.severity !== 'All') {
        issues = issues.filter(i => i.severity === query.severity);
      }
      if (query.status && query.status !== 'All') {
        issues = issues.filter(i => i.status === query.status);
      }

      // Sort
      const sortBy = query.sort || 'priority';
      if (sortBy === 'priority') {
        issues.sort((a, b) => b.priorityScore - a.priorityScore);
      } else if (sortBy === 'complaints') {
        issues.sort((a, b) => b.complaintCount - a.complaintCount);
      } else if (sortBy === 'recency') {
        issues.sort((a, b) => new Date(b.lastDetectedDate) - new Date(a.lastDetectedDate));
      }

      return sendJSON(res, 200, { issues });
    }

    // 10. Individual Issue Detail with supporting feedback
    if (req.method === 'GET' && pathname.startsWith('/api/issues/')) {
      const id = pathname.replace('/api/issues/', '');
      const issues = db.get('detected_issues');
      const issue = issues.find(i => i.id === id);
      if (!issue) {
        return sendJSON(res, 404, { error: 'Issue not found' });
      }

      const allFeedback = db.get('feedback');
      const supportingFeedback = allFeedback.filter(f => (issue.feedbackIds || []).includes(f.feedback_id)).slice(0, 20);

      const rootCauses = db.get('root_cause_analysis');
      const rc = rootCauses.find(r => r.issueId === issue.id) || null;

      const interventions = db.get('interventions');
      const intervention = interventions.find(intv => intv.issueId === issue.id) || null;

      return sendJSON(res, 200, { issue, supportingFeedback, rootCause: rc, intervention });
    }

    // 11. Root Cause Analysis
    if (req.method === 'GET' && pathname === '/api/root-causes') {
      const rootCauses = db.get('root_cause_analysis');
      return sendJSON(res, 200, { rootCauses });
    }

    // 12. Customer Segments
    if (req.method === 'GET' && pathname === '/api/customer-segments') {
      const segments = db.get('customer_segments');
      return sendJSON(res, 200, { segments });
    }

    // 13. Interventions GET
    if (req.method === 'GET' && pathname === '/api/interventions') {
      const interventions = db.get('interventions');
      return sendJSON(res, 200, { interventions });
    }

    // 14. Interventions PUT (Approve, Reject, Status changes)
    if (req.method === 'PUT' && pathname.startsWith('/api/interventions/')) {
      const id = pathname.replace('/api/interventions/', '');
      const raw = await parseBody(req);
      const updates = JSON.parse(raw);

      const updated = db.updateIntervention(id, updates);
      if (updated) {
        return sendJSON(res, 200, { success: true, intervention: updated });
      } else {
        return sendJSON(res, 404, { error: 'Intervention not found' });
      }
    }

    // 15. KPI Monitoring
    if (req.method === 'GET' && pathname === '/api/kpis') {
      const kpis = db.get('kpi_metrics');
      const timeframe = query.timeframe || 'weekly'; // daily, weekly, monthly
      return sendJSON(res, 200, { kpis, timeframe });
    }

    // 16. Reports Summary
    if (req.method === 'GET' && pathname === '/api/reports') {
      const stats = db.getOverviewStats();
      const issues = db.get('detected_issues');
      const rootCauses = db.get('root_cause_analysis');
      const interventions = db.get('interventions');
      const kpis = db.get('kpi_metrics');
      const segments = db.get('customer_segments');

      return sendJSON(res, 200, {
        generatedAt: new Date().toISOString(),
        stats,
        issues,
        rootCauses,
        interventions,
        kpis,
        topVulnerableSegments: segments.geography ? segments.geography.slice(0, 3) : []
      });
    }

    // 17. Reports Export CSV
    if (req.method === 'GET' && pathname === '/api/reports/export-csv') {
      const issues = db.get('detected_issues');
      const interventions = db.get('interventions');

      let csv = 'Issue ID,Issue Name,Category,Severity,Priority Score,Complaint Count,Affected Customers,Surge Trend,Status,Recommended Recovery,Department,Intervention Status\n';
      issues.forEach(iss => {
        const intv = interventions.find(i => i.issueId === iss.id) || {};
        csv += `"${iss.id}","${iss.name.replace(/"/g, '""')}","${iss.category}","${iss.severity}",${iss.priorityScore},${iss.complaintCount},${iss.affectedCustomers},"${iss.frequencyTrend}","${iss.status}","${(intv.recoveryTitle || '').replace(/"/g, '""')}","${intv.assignedDepartment || ''}","${intv.status || ''}"\n`;
      });

      res.writeHead(200, {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="cx_guardian_executive_report.csv"'
      });
      return res.end(csv);
    }

    // 18. Settings GET
    if (req.method === 'GET' && pathname === '/api/settings') {
      const settings = db.get('settings');
      const collectionStats = {
        customers: db.get('customers').length,
        feedback: db.get('feedback').length,
        transactions: db.get('transactions').length,
        detected_issues: db.get('detected_issues').length,
        issue_evidence: db.get('issue_evidence').length,
        root_cause_analysis: db.get('root_cause_analysis').length,
        customer_segments: (db.get('customer_segments').atRiskCustomers || []).length,
        interventions: db.get('interventions').length,
        analysis_history: db.get('analysis_history').length
      };

      return sendJSON(res, 200, {
        settings: {
          ...settings,
          geminiApiKey: settings.geminiApiKey ? `${settings.geminiApiKey.slice(0, 4)}••••••••${settings.geminiApiKey.slice(-4)}` : ''
        },
        collectionStats
      });
    }

    // 19. Settings POST (Update weights / API Key)
    if (req.method === 'POST' && pathname === '/api/settings') {
      const raw = await parseBody(req);
      const updates = JSON.parse(raw);
      const current = db.get('settings');

      if (updates.geminiApiKey !== undefined) current.geminiApiKey = updates.geminiApiKey;
      if (updates.geminiModel) current.geminiModel = updates.geminiModel;
      if (updates.weights) current.weights = updates.weights;
      current.updatedAt = new Date().toISOString();

      db.set('settings', current);
      // Re-run analysis with updated weights
      db.runAnalysis();
      return sendJSON(res, 200, { success: true, settings: current });
    }

    // 20. Database Reset
    if (req.method === 'POST' && pathname === '/api/settings/reset') {
      db.resetDatabase();
      return sendJSON(res, 200, { success: true, message: 'Database reset to empty state.' });
    }
  } catch (apiErr) {
    console.error('API Error:', apiErr);
    return sendJSON(res, 500, { error: apiErr.message || 'Internal Server Error' });
  }

  // -------------------------------------------------------------
  // STATIC ASSET SERVING & SPA FALLBACK
  // -------------------------------------------------------------

  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath).toLowerCase();

  // If file doesn't exist, fallback to index.html for SPA routing
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }

  const contentType = MIME_TYPES[path.extname(filePath)] || 'text/html; charset=utf-8';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      return res.end('500 - Server File Read Error');
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });
    res.end(content);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🛡️  CX GUARDIAN - AI RECOVERY PLATFORM (ACTIVE)`);
  console.log(`🚀  Port: ${PORT}`);
  console.log(`🌐  Local URL: http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
