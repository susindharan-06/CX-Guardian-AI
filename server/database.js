// server/database.js
// Persistent JSON database matching the Firestore collections schema:
// - customers
// - feedback
// - transactions
// - detected_issues
// - issue_evidence
// - root_cause_analysis
// - customer_segments
// - interventions
// - kpi_metrics
// - analysis_history

const fs = require('fs');
const path = require('path');
const { generateDemoRecords } = require('./demo_data_generator');
const { runFullCXAnalysis } = require('./ai_engine');

const DATA_DIR = path.join(__dirname, 'data');

const COLLECTIONS = [
  'customers',
  'feedback',
  'transactions',
  'detected_issues',
  'issue_evidence',
  'root_cause_analysis',
  'customer_segments',
  'interventions',
  'kpi_metrics',
  'analysis_history',
  'settings'
];

class Database {
  constructor() {
    this.ensureDataDir();
    this.cache = {};
    this.loadAll();

    // Auto-seed if feedback collection is empty
    if (!this.cache.feedback || this.cache.feedback.length === 0) {
      console.log('Seeding initial 525 demo records...');
      this.seedDemoData();
    }
  }

  ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  getFilePath(collectionName) {
    return path.join(DATA_DIR, `${collectionName}.json`);
  }

  loadAll() {
    COLLECTIONS.forEach(col => {
      const file = this.getFilePath(col);
      if (fs.existsSync(file)) {
        try {
          const raw = fs.readFileSync(file, 'utf8');
          this.cache[col] = JSON.parse(raw);
        } catch (e) {
          this.cache[col] = col === 'settings' ? this.defaultSettings() : [];
        }
      } else {
        this.cache[col] = col === 'settings' ? this.defaultSettings() : [];
        this.save(col);
      }
    });
  }

  defaultSettings() {
    return {
      geminiApiKey: '',
      geminiModel: 'gemini-2.5-flash',
      weights: {
        severity: 0.30,
        frequency: 0.25,
        impact: 0.25,
        growth: 0.20
      },
      updatedAt: new Date().toISOString()
    };
  }

  save(collectionName) {
    const file = this.getFilePath(collectionName);
    fs.writeFileSync(file, JSON.stringify(this.cache[collectionName], null, 2), 'utf8');
  }

  get(collectionName) {
    return this.cache[collectionName] || [];
  }

  set(collectionName, data) {
    this.cache[collectionName] = data;
    this.save(collectionName);
  }

  // Seed 520+ records
  seedDemoData() {
    const demoRecords = generateDemoRecords(525);
    this.set('feedback', demoRecords);

    // Populate transactions collection from feedback
    const transactions = demoRecords.map(r => ({
      transaction_id: r.transaction_id,
      order_id: r.order_id,
      customer_id: r.customer_id,
      payment_method: 'UPI / Credit Card',
      order_status: r.order_status,
      refund_status: r.refund_status,
      delivery_partner: r.delivery_partner,
      timestamp: r.created_at
    }));
    this.set('transactions', transactions);

    // Populate customers collection
    const customerMap = {};
    demoRecords.forEach(r => {
      if (!customerMap[r.customer_id]) {
        customerMap[r.customer_id] = {
          customer_id: r.customer_id,
          tier: r.customer_tier || 'Regular',
          location: r.location,
          total_orders: 1,
          created_at: r.created_at
        };
      } else {
        customerMap[r.customer_id].total_orders++;
      }
    });
    this.set('customers', Object.values(customerMap));

    // Run Initial AI Analysis
    this.runAnalysis();
    return demoRecords.length;
  }

  // Reset database
  resetDatabase() {
    COLLECTIONS.forEach(col => {
      if (col === 'settings') {
        this.cache[col] = this.defaultSettings();
      } else {
        this.cache[col] = [];
      }
      this.save(col);
    });
  }

  // Add individual feedback
  addFeedback(feedback) {
    const records = this.get('feedback');
    const newId = `FB-${String(records.length + 1).padStart(5, '0')}`;
    const newRecord = {
      feedback_id: newId,
      customer_id: feedback.customer_id || `CUST-${Math.floor(Math.random() * 900) + 100}`,
      customer_tier: feedback.customer_tier || 'Regular',
      feedback_text: feedback.feedback_text,
      rating: Number(feedback.rating) || 3,
      product: feedback.product || 'SmartHome Hub Pro',
      location: feedback.location || 'Chennai',
      source: feedback.source || 'Customer Reviews',
      date: feedback.date || new Date().toISOString().split('T')[0],
      order_id: feedback.order_id || `ORD-2026-${Math.floor(Math.random() * 90000) + 10000}`,
      transaction_id: feedback.transaction_id || `TXN-${Math.floor(Math.random() * 9000000) + 1000000}`,
      delivery_partner: feedback.delivery_partner || 'ExpressLogistics',
      order_status: feedback.order_status || 'Delivered',
      refund_status: feedback.refund_status || 'None',
      created_at: new Date().toISOString()
    };
    records.unshift(newRecord);
    this.set('feedback', records);
    return newRecord;
  }

  // Delete feedback
  deleteFeedback(feedbackId) {
    let records = this.get('feedback');
    const initialLen = records.length;
    records = records.filter(r => r.feedback_id !== feedbackId);
    if (records.length !== initialLen) {
      this.set('feedback', records);
      return true;
    }
    return false;
  }

  // Run full CX Analysis Pipeline
  runAnalysis() {
    const feedbackRecords = this.get('feedback');
    const settings = this.get('settings');
    const weights = settings.weights || { severity: 0.30, frequency: 0.25, impact: 0.25, growth: 0.20 };

    const result = runFullCXAnalysis(feedbackRecords, weights);

    // Save into respective collections
    this.set('detected_issues', result.issues);
    this.set('root_cause_analysis', result.rootCauses);
    this.set('customer_segments', result.segments);
    this.set('interventions', result.interventions);
    this.set('kpi_metrics', result.kpis);

    // Record analysis history
    const history = this.get('analysis_history');
    history.unshift({
      timestamp: new Date().toISOString(),
      recordCount: feedbackRecords.length,
      issueCount: result.issues.length,
      negativeCount: feedbackRecords.filter(r => r.sentiment === 'Negative').length,
      summary: result.summary
    });
    this.set('analysis_history', history.slice(0, 20)); // Keep last 20

    return result;
  }

  // Update Intervention status
  updateIntervention(interventionId, updates) {
    const list = this.get('interventions');
    const idx = list.findIndex(i => i.id === interventionId);
    if (idx === -1) return null;

    const item = list[idx];
    if (updates.status) item.status = updates.status;
    if (updates.managerDecision) item.managerDecision = updates.managerDecision;
    if (updates.assignedDepartment) item.assignedDepartment = updates.assignedDepartment;
    if (updates.notes !== undefined) item.notes = updates.notes;

    if (updates.status === 'Approved') {
      item.approvedBy = 'Administrator (Manager Approval)';
      item.approvedAt = new Date().toISOString();
    } else if (updates.status === 'Resolved') {
      item.resolvedAt = new Date().toISOString();
    }

    list[idx] = item;
    this.set('interventions', list);

    // Also update associated detected issue status if applicable
    if (item.issueId && updates.status) {
      const issues = this.get('detected_issues');
      const issueIdx = issues.findIndex(iss => iss.id === item.issueId);
      if (issueIdx !== -1) {
        if (updates.status === 'In Progress') issues[issueIdx].status = 'In Progress';
        if (updates.status === 'Resolved') issues[issueIdx].status = 'Resolved';
        this.set('detected_issues', issues);
      }
    }

    return item;
  }

  // Get Stats overview
  getOverviewStats() {
    const feedback = this.get('feedback');
    const issues = this.get('detected_issues');
    const interventions = this.get('interventions');
    const segments = this.get('customer_segments');

    const totalFeedback = feedback.length;
    const negativeFeedback = feedback.filter(r => r.sentiment === 'Negative' || r.rating <= 2).length;
    const detectedIssuesCount = issues.length;
    const criticalIssuesCount = issues.filter(i => i.severity === 'Critical').length;
    const affectedCustomersCount = segments.totalAffectedCustomers || issues.reduce((acc, i) => acc + (i.affectedCustomers || 0), 0);
    const recoveryActionsCount = interventions.length;
    const resolvedIssuesCount = interventions.filter(i => i.status === 'Resolved').length;

    return {
      totalFeedback,
      negativeFeedback,
      detectedIssuesCount,
      criticalIssuesCount,
      affectedCustomersCount,
      recoveryActionsCount,
      resolvedIssuesCount
    };
  }
}

const db = new Database();

module.exports = { db };
