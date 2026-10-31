# server_py/ai_engine.py
# Python Scikit-Learn TF-IDF, KMeans & Evidence-Based Root Cause Discovery

import math
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans

def calculate_priority_score(severity, complaint_count, affected_customers, growth_surge, weights=None):
    if weights is None:
        weights = {"severity": 0.30, "frequency": 0.25, "impact": 0.25, "growth": 0.20}

    sev_map = {"Critical": 100, "High": 75, "Medium": 45, "Low": 20}
    sev_pts = sev_map.get(severity, 50)
    freq_pts = min(100.0, (complaint_count / 70.0) * 100.0)
    impact_pts = min(100.0, (affected_customers / 50.0) * 100.0)
    growth_pts = min(100.0, max(0.0, (growth_surge / 50.0) * 100.0))

    score = (
        (weights["severity"] * sev_pts) +
        (weights["frequency"] * freq_pts) +
        (weights["impact"] * impact_pts) +
        (weights["growth"] * growth_pts)
    )
    final_score = int(min(100, max(1, round(score))))
    return final_score

def run_cluster_analysis(feedback_records):
    df = pd.DataFrame(feedback_records)
    if df.empty:
        return []

    # Filter negative records
    neg_df = df[(df["rating"] <= 2) | (df.get("raw_sentiment") == "Negative")].copy()
    if neg_df.empty:
        return []

    vectorizer = TfidfVectorizer(max_features=150, stop_words="english", ngram_range=(1, 2))
    X = vectorizer.fit_transform(neg_df["feedback_text"])

    num_clusters = min(4, len(neg_df))
    kmeans = KMeans(n_clusters=num_clusters, random_state=42, n_init=10)
    neg_df["cluster"] = kmeans.fit_predict(X)

    issues = []
    for c_id, group in neg_df.groupby("cluster"):
        issue_name = f"Emerging Complaint Cluster #{c_id + 1}"
        sev = "High" if len(group) > 30 else "Medium"
        score = calculate_priority_score(sev, len(group), group["customer_id"].nunique(), 32.5)

        issues.append({
            "id": f"ISSUE-PY-{c_id + 1}",
            "name": issue_name,
            "severity": sev,
            "priorityScore": score,
            "complaintCount": len(group),
            "affectedCustomers": group["customer_id"].nunique()
        })
    return issues
