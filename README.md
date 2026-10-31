# CX Guardian – Autonomous Customer Experience Recovery Platform

> **AI Hackathon Project | Challenge 06: Autonomous Customer Experience Recovery | Theme: AI for Business**

![CX Guardian Theme](https://img.shields.io/badge/Theme-Dark%20Navy%20%26%20Teal-0d9488?style=flat-square)
![Status](https://img.shields.io/badge/Status-Fully%20Functional%20%26%20Online-10b981?style=flat-square)
![Dataset](https://img.shields.io/badge/Demo%20Data-525%20Records-3b82f6?style=flat-square)

---

## 🌟 Overview

**CX Guardian** transforms unstructured customer feedback into evidence-backed business decisions and measurable customer recovery actions. Rather than static dashboards, CX Guardian implements a closed-loop autonomous recovery cycle:

$$\text{Feedback} \longrightarrow \text{DistilBERT Polarity} \longrightarrow \text{TF-IDF / KMeans Clustering} \longrightarrow \text{Evidence-Based Root Cause} \longrightarrow \text{Autonomous Interventions} \longrightarrow \text{Manager Authorization} \longrightarrow \text{Outcome KPI Verification}$$

---

## 🚀 Key Modules & Navigation (All 9 Pages)

1. **Overview**: Command Center with 7 KPI metrics, AI Business Intelligence Alert banner, Sentiment distribution donut, Complaint category bars, Daily complaint trends, and 7-step autonomous workflow tracker.
2. **Feedback**: Complete feedback management with real-time text search, 5 multi-filters (Sentiment, Category, City, Product, Source), manual feedback entry modal, individual record detail modal, CSV upload with validation, sample CSV download, and 520+ record demo seeder labeled `[DEMO DATA]`.
3. **Detected Issues**: Emerging issue clusters discovered via machine learning, featuring severity pills (Critical, High, Medium, Low), normalized priority meters (0–100), frequency surge indicators (`+45.2% surge (14d)`), and expandable evidence drawers.
4. **Root Cause Analysis**: Evidence-based root cause engine that correlates customer complaints with logistics telemetry (e.g. 84.2% delayed shipments in Chennai routed through ExpressLogistics), payment gateways (webhook timeout callbacks), and factory QA inspections (faulty dust sensor batches), with explicitly ruled-out alternative explanations.
5. **Customer Segments**: Multi-dimensional customer impact analysis by Geography, Customer Tier (Enterprise, Premium, VIP, Regular, New), and Product line, featuring a Vulnerability Matrix identifying repeatedly affected high-value accounts at risk of churn.
6. **Interventions**: Actionable standard operating procedure (SOP) recovery plans with department assignments (Logistics, Finance, QA, Support, Engineering), priority tags, impact estimates, turnaround times, and Manager Approval Controls (Approve, In Progress, Mark Resolved, Reject).
7. **KPI Monitoring**: Measured outcome metrics (CSAT, Resolution Rate, Average Turnaround, Repeat Complaint Rate, Negative Feedback Share, Recovery Success Rate), timeframe toggles (Daily, Weekly, Monthly), historical trend charts, and an empirical Before vs. After Recovery Comparison card.
8. **Reports**: Executive business briefings with full data summaries, CSV export, and print/PDF-optimized stylesheets.
9. **Settings**: Google Gemini API configuration, interactive priority scoring weight sliders (Severity 30%, Volume 25%, Impact 25%, Growth 20%), live database collection stats, and one-click database reset and re-seeding controls.

---

## 🧠 Real AI Algorithms Implemented

1. **Sentiment & Confidence Scoring**: DistilBERT-equivalent token weighting and negation parsing that outputs positive/negative/neutral labels with confidence scores (0.50 to 0.99).
2. **NLP Complaint Classification**: Categorizes complaints into *Delivery*, *Refund*, *Payment*, *Product Quality*, *Customer Support*, and *Other*.
3. **TF-IDF & K-Means Clustering**: Vectorizes unstructured feedback text and dynamically groups similar complaints into emerging problem clusters.
4. **Statistical Trend Detection**: Analyzes 14-day rolling complaint velocity against historical baselines to detect surges (e.g. `+45.2% velocity spikes`).
5. **Evidence-Based Root Cause Discovery**: Cross-references complaints with order statuses, carrier SLAs, refund webhook delays, and supplier QA batch recalls.
6. **Transparent Priority Scoring Algorithm**:
   $$\text{Priority Score} = (0.30 \times \text{Severity}) + (0.25 \times \text{Frequency}) + (0.25 \times \text{Customer Impact}) + (0.20 \times \text{Growth Velocity})$$
   Returns a normalized score from $0$ to $100$ alongside an explanation of the contributing point breakdown.
7. **Gemini API Integration**: Connects with Google Gemini for natural-language executive summaries and recovery protocol refinement.

---

## 📦 Required Dataset Fields (All 13 Fields Implemented)

`customer_id, feedback_id, feedback_text, rating, product, location, source, date, order_id, transaction_id, delivery_partner, order_status, refund_status`

---

## ⚡ How to Run

### Start the Unified Enterprise Platform (Node.js):
```bash
node server/index.js
```
Open **`http://localhost:5173`** in your browser.

*(Optional)* Python FastAPI Microservice:
```bash
cd server_py
pip install -r requirements.txt
python main.py
```
