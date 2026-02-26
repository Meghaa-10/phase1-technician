import json
import os
from collections import defaultdict
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import anthropic

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

app = Flask(__name__)
CORS(app)

DATA_FILE = os.path.join(os.path.dirname(__file__), "data.json")

with open(DATA_FILE, "r") as f:
    data = json.load(f)

claude_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


# ── Pre-compute global averages per job type (used by AI insights) ──────────

def _build_global_job_type_stats():
    """Aggregate metrics per job type across ALL technicians/jobs."""
    buckets = defaultdict(lambda: {
        "count": 0, "ftf_count": 0, "sla_count": 0,
        "revisit_count": 0, "total_time": 0,
    })
    for job in data["jobs"]:
        b = buckets[job["jobType"]]
        b["count"] += 1
        b["total_time"] += job["completionTimeMinutes"]
        if job["firstTimeFix"]:
            b["ftf_count"] += 1
        if job["slaCompliant"]:
            b["sla_count"] += 1
        if job["revisitRequired"]:
            b["revisit_count"] += 1

    stats = {}
    for jt, b in buckets.items():
        n = b["count"]
        stats[jt] = {
            "avgFTFR": round((b["ftf_count"] / n) * 100, 1),
            "avgTime": round(b["total_time"] / n),
            "avgSLA": round((b["sla_count"] / n) * 100, 1),
            "avgRepeatRate": round((b["revisit_count"] / n) * 100, 1),
            "totalJobs": n,
        }
    return stats


def _build_global_overall_stats():
    """Compute overall averages across all active technicians."""
    active = [t for t in data["technicians"] if t["totalJobsCompleted"] > 0]
    n = len(active)
    if n == 0:
        return {}
    return {
        "avgFTFR": round(sum(t["firstTimeFixRate"] for t in active) / n, 1),
        "avgTime": round(sum(t["avgCompletionTimeMinutes"] for t in active) / n),
        "avgCompletionRate": round(sum(t["completionRate"] for t in active) / n, 1),
        "avgJobsPerWeek": round(sum(t["jobsPerWeek"] for t in active) / n, 1),
        "avgSLA": round(sum(t["slaComplianceRate"] for t in active) / n, 1),
        "avgScore": round(sum(t["performanceScore"] for t in active) / n, 1),
    }


GLOBAL_JOB_TYPE_STATS = _build_global_job_type_stats()
GLOBAL_OVERALL_STATS = _build_global_overall_stats()


@app.route("/api/technicians", methods=["GET"])
def get_technicians():
    """Return all technicians with optional filters."""
    techs = data["technicians"]

    region = request.args.get("region")
    role = request.args.get("role")
    nom = request.args.get("nom")
    rom = request.args.get("rom")

    if region:
        techs = [t for t in techs if t["region"] == region]
    if role:
        techs = [t for t in techs if t["role"] == role]
    if nom:
        techs = [t for t in techs if t["nom"] == nom]
    if rom:
        techs = [t for t in techs if t["rom"] == rom]

    return jsonify(techs)


@app.route("/api/technicians/<network_id>", methods=["GET"])
def get_technician(network_id):
    """Return a single technician by network ID."""
    tech = next((t for t in data["technicians"] if t["networkId"] == network_id), None)
    if not tech:
        return jsonify({"error": "Technician not found"}), 404
    return jsonify(tech)


@app.route("/api/technicians/<network_id>/jobs", methods=["GET"])
def get_technician_jobs(network_id):
    """Return jobs for a specific technician with optional date/type filters."""
    jobs = [j for j in data["jobs"] if j["technicianId"] == network_id]

    job_type = request.args.get("jobType")
    date_from = request.args.get("dateFrom")
    date_to = request.args.get("dateTo")

    if job_type:
        jobs = [j for j in jobs if j["jobType"] == job_type]
    if date_from:
        jobs = [j for j in jobs if j["date"] >= date_from]
    if date_to:
        jobs = [j for j in jobs if j["date"] <= date_to]

    return jsonify(jobs)


@app.route("/api/jobs", methods=["GET"])
def get_jobs():
    """Return all jobs with optional filters."""
    jobs = data["jobs"]

    region = request.args.get("region")
    job_type = request.args.get("jobType")
    date_from = request.args.get("dateFrom")
    date_to = request.args.get("dateTo")
    technician_id = request.args.get("technicianId")

    if region:
        jobs = [j for j in jobs if j["region"] == region]
    if job_type:
        jobs = [j for j in jobs if j["jobType"] == job_type]
    if date_from:
        jobs = [j for j in jobs if j["date"] >= date_from]
    if date_to:
        jobs = [j for j in jobs if j["date"] <= date_to]
    if technician_id:
        jobs = [j for j in jobs if j["technicianId"] == technician_id]

    return jsonify(jobs)


@app.route("/api/thresholds", methods=["GET"])
def get_thresholds():
    """Return statistical thresholds for outlier detection."""
    return jsonify(data["thresholds"])


@app.route("/api/filters", methods=["GET"])
def get_filters():
    """Return available filter options."""
    return jsonify(data["filterOptions"])


@app.route("/api/date-range", methods=["GET"])
def get_date_range():
    """Return the min/max dates of available job data."""
    return jsonify(data["dateRange"])


@app.route("/api/rankings", methods=["GET"])
def get_rankings():
    """
    Return technicians ranked by a given metric.
    Query params:
      - sortBy: firstTimeFixRate | avgCompletionTimeMinutes | jobsPerWeek |
                completionRate | slaComplianceRate | performanceScore (default: performanceScore)
      - order: asc | desc (default: desc)
      - region, role, nom, rom: optional filters
      - dateFrom, dateTo: optional date range (recomputes metrics from filtered jobs)
      - jobType: optional job type filter (recomputes metrics from filtered jobs)
    """
    sort_by = request.args.get("sortBy", "performanceScore")
    order = request.args.get("order", "desc")
    region = request.args.get("region")
    role = request.args.get("role")
    nom = request.args.get("nom")
    rom = request.args.get("rom")
    date_from = request.args.get("dateFrom")
    date_to = request.args.get("dateTo")
    job_type = request.args.get("jobType")

    techs = data["technicians"]

    # Filter technicians
    if region:
        techs = [t for t in techs if t["region"] == region]
    if role:
        techs = [t for t in techs if t["role"] == role]
    if nom:
        techs = [t for t in techs if t["nom"] == nom]
    if rom:
        techs = [t for t in techs if t["rom"] == rom]

    # If date or job type filters are applied, recompute metrics from filtered jobs
    if date_from or date_to or job_type:
        recomputed = []
        for tech in techs:
            jobs = [j for j in data["jobs"] if j["technicianId"] == tech["networkId"]]
            if job_type:
                jobs = [j for j in jobs if j["jobType"] == job_type]
            if date_from:
                jobs = [j for j in jobs if j["date"] >= date_from]
            if date_to:
                jobs = [j for j in jobs if j["date"] <= date_to]

            if not jobs:
                recomputed.append({
                    **tech,
                    "totalTasksAssigned": 0,
                    "totalJobsCompleted": 0,
                    "completionRate": 0,
                    "firstTimeFixRate": 0,
                    "avgCompletionTimeMinutes": 0,
                    "jobsPerWeek": 0,
                    "slaComplianceRate": 0,
                    "repeatVisitRate": 0,
                    "performanceScore": 0,
                })
                continue

            total = len(jobs)
            ftfr_count = sum(1 for j in jobs if j["firstTimeFix"])
            avg_time = sum(j["completionTimeMinutes"] for j in jobs) / total
            sla_count = sum(1 for j in jobs if j["slaCompliant"])
            revisit_count = sum(1 for j in jobs if j["revisitRequired"])

            from datetime import datetime
            dates = [datetime.strptime(j["date"], "%Y-%m-%d") for j in jobs]
            weeks_spanned = max(1, (max(dates) - min(dates)).days / 7)

            # Keep the original completion rate and assigned count
            cr = tech.get("completionRate", 90)
            assigned = tech.get("totalTasksAssigned", total)

            recomputed.append({
                **tech,
                "totalTasksAssigned": assigned,
                "totalJobsCompleted": total,
                "completionRate": cr,
                "firstTimeFixRate": round((ftfr_count / total) * 1000) / 10,
                "avgCompletionTimeMinutes": round(avg_time),
                "jobsPerWeek": round((total / weeks_spanned) * 10) / 10,
                "slaComplianceRate": round((sla_count / total) * 1000) / 10,
                "repeatVisitRate": round((revisit_count / total) * 1000) / 10,
                "performanceScore": tech.get("performanceScore", 0),
            })

        techs = recomputed

    # Only include technicians with jobs
    techs = [t for t in techs if t["totalJobsCompleted"] > 0]

    # Sort
    reverse = order == "desc"
    # For avgCompletionTimeMinutes, lower is better, so flip the sort
    if sort_by == "avgCompletionTimeMinutes":
        reverse = not reverse

    techs.sort(key=lambda t: t.get(sort_by, 0), reverse=reverse)

    # Add rank
    for i, tech in enumerate(techs):
        tech["rank"] = i + 1

    # Compute thresholds for current filtered set
    if techs:
        values = [t[sort_by] for t in techs]
        n = len(values)
        sorted_vals = sorted(values)
        top_threshold = sorted_vals[max(0, int(n * 0.9))]
        bottom_threshold = sorted_vals[min(n - 1, int(n * 0.1))]
    else:
        top_threshold = 0
        bottom_threshold = 0

    return jsonify({
        "technicians": techs,
        "meta": {
            "total": len(techs),
            "sortBy": sort_by,
            "order": order,
            "thresholds": {
                "top10": top_threshold,
                "bottom10": bottom_threshold,
            },
        },
    })


@app.route("/api/summary", methods=["GET"])
def get_summary():
    """Return aggregate summary statistics."""
    techs = [t for t in data["technicians"] if t["totalJobsCompleted"] > 0]

    if not techs:
        return jsonify({})

    avg_ftfr = sum(t["firstTimeFixRate"] for t in techs) / len(techs)
    avg_time = sum(t["avgCompletionTimeMinutes"] for t in techs) / len(techs)
    avg_jpw = sum(t["jobsPerWeek"] for t in techs) / len(techs)
    avg_cr = sum(t["completionRate"] for t in techs) / len(techs)
    avg_sla = sum(t["slaComplianceRate"] for t in techs) / len(techs)
    avg_score = sum(t["performanceScore"] for t in techs) / len(techs)
    total_jobs = sum(t["totalJobsCompleted"] for t in techs)

    return jsonify({
        "totalTechnicians": len(techs),
        "totalJobs": total_jobs,
        "avgFirstTimeFixRate": round(avg_ftfr * 10) / 10,
        "avgCompletionTime": round(avg_time),
        "avgJobsPerWeek": round(avg_jpw * 10) / 10,
        "avgCompletionRate": round(avg_cr * 10) / 10,
        "avgSlaCompliance": round(avg_sla * 10) / 10,
        "avgPerformanceScore": round(avg_score * 10) / 10,
    })


@app.route("/api/technicians/<network_id>/ai-insights", methods=["GET"])
def get_ai_insights(network_id):
    """Generate AI-powered performance insights for a technician using Claude."""
    tech = next((t for t in data["technicians"] if t["networkId"] == network_id), None)
    if not tech:
        return jsonify({"error": "Technician not found"}), 404

    tech_jobs = [j for j in data["jobs"] if j["technicianId"] == network_id]
    if not tech_jobs:
        return jsonify({"error": "No job data available"}), 404

    # Per-job-type breakdown for THIS technician
    jt_buckets = defaultdict(lambda: {
        "count": 0, "ftf_count": 0, "sla_count": 0,
        "revisit_count": 0, "total_time": 0,
    })
    for job in tech_jobs:
        b = jt_buckets[job["jobType"]]
        b["count"] += 1
        b["total_time"] += job["completionTimeMinutes"]
        if job["firstTimeFix"]:
            b["ftf_count"] += 1
        if job["slaCompliant"]:
            b["sla_count"] += 1
        if job["revisitRequired"]:
            b["revisit_count"] += 1

    job_type_comparison = []
    for jt, b in jt_buckets.items():
        n = b["count"]
        g = GLOBAL_JOB_TYPE_STATS.get(jt, {})
        job_type_comparison.append({
            "jobType": jt,
            "count": n,
            "techFTFR": round((b["ftf_count"] / n) * 100, 1),
            "globalFTFR": g.get("avgFTFR", 0),
            "techAvgTime": round(b["total_time"] / n),
            "globalAvgTime": g.get("avgTime", 0),
            "techSLA": round((b["sla_count"] / n) * 100, 1),
            "globalSLA": g.get("avgSLA", 0),
            "techRepeatRate": round((b["revisit_count"] / n) * 100, 1),
            "globalRepeatRate": g.get("avgRepeatRate", 0),
        })

    job_type_comparison.sort(key=lambda x: x["count"], reverse=True)

    # Regional peers for context
    region_peers = [
        t for t in data["technicians"]
        if t["region"] == tech["region"]
        and t["networkId"] != network_id
        and t["totalJobsCompleted"] > 0
    ]
    region_avg_score = 0
    if region_peers:
        region_avg_score = round(
            sum(t["performanceScore"] for t in region_peers) / len(region_peers), 1
        )

    prompt = f"""You are an expert field service performance analyst. Analyze this technician's performance data and provide actionable insights.

## Technician Profile
- Name: {tech['name']}
- Role: {tech['role']}
- Region: {tech['region']}, {tech['city']}
- Skills: {', '.join(tech.get('skills', []))}
- Performance Tier: {tech['performanceTier']}
- Active Since: {tech['activationDate']}

## Overall Metrics (vs Company Average)
| Metric | {tech['name']} | Company Avg | Difference |
|--------|-----------|-------------|------------|
| Performance Score | {tech['performanceScore']} | {GLOBAL_OVERALL_STATS['avgScore']} | {round(tech['performanceScore'] - GLOBAL_OVERALL_STATS['avgScore'], 1)} |
| FTFR | {tech['firstTimeFixRate']}% | {GLOBAL_OVERALL_STATS['avgFTFR']}% | {round(tech['firstTimeFixRate'] - GLOBAL_OVERALL_STATS['avgFTFR'], 1)} |
| Avg Completion Time | {tech['avgCompletionTimeMinutes']} min | {GLOBAL_OVERALL_STATS['avgTime']} min | {round(tech['avgCompletionTimeMinutes'] - GLOBAL_OVERALL_STATS['avgTime'])} min |
| Completion Rate | {tech['completionRate']}% | {GLOBAL_OVERALL_STATS['avgCompletionRate']}% | {round(tech['completionRate'] - GLOBAL_OVERALL_STATS['avgCompletionRate'], 1)} |
| Jobs/Week | {tech['jobsPerWeek']} | {GLOBAL_OVERALL_STATS['avgJobsPerWeek']} | {round(tech['jobsPerWeek'] - GLOBAL_OVERALL_STATS['avgJobsPerWeek'], 1)} |
| SLA Compliance | {tech['slaComplianceRate']}% | {GLOBAL_OVERALL_STATS['avgSLA']}% | {round(tech['slaComplianceRate'] - GLOBAL_OVERALL_STATS['avgSLA'], 1)} |

## Regional Context
- Region avg performance score: {region_avg_score} (vs this tech: {tech['performanceScore']})
- Number of peers in region: {len(region_peers)}

## Per-Job-Type Performance Breakdown (Tech vs Global Avg)
"""
    for jt in job_type_comparison:
        prompt += f"""
### {jt['jobType']} ({jt['count']} jobs)
- FTFR: {jt['techFTFR']}% vs {jt['globalFTFR']}% avg (diff: {round(jt['techFTFR'] - jt['globalFTFR'], 1)})
- Avg Time: {jt['techAvgTime']} min vs {jt['globalAvgTime']} min avg (diff: {jt['techAvgTime'] - jt['globalAvgTime']} min)
- SLA: {jt['techSLA']}% vs {jt['globalSLA']}% avg (diff: {round(jt['techSLA'] - jt['globalSLA'], 1)})
- Repeat Visit Rate: {jt['techRepeatRate']}% vs {jt['globalRepeatRate']}% avg (diff: {round(jt['techRepeatRate'] - jt['globalRepeatRate'], 1)})
"""

    prompt += """
## Instructions
Based on ALL the data above, provide your analysis in EXACTLY this JSON format (no markdown, no code fences, just raw JSON):

{
  "summary": "2-3 sentence overall performance summary. Be specific with numbers. Compare to averages.",
  "strengths": [
    "Specific strength 1 with numbers",
    "Specific strength 2 with numbers"
  ],
  "improvements": [
    {
      "area": "Short label (e.g. 'Fibre Repair Speed')",
      "detail": "Specific observation with numbers comparing to average",
      "recommendation": "Actionable recommendation"
    }
  ],
  "trainingRecommendations": [
    {
      "skill": "Specific skill or certification name",
      "reason": "Why this training is needed based on the data"
    }
  ]
}

Rules:
- Look at ALL metrics (FTFR, completion time, SLA, repeat visits) per job type to find weaknesses, not just FTFR.
- Identify job types where the technician is significantly below the global average on ANY metric.
- For training recommendations, map the weak job types/metrics to specific skills they should learn.
- Be concise but specific. Always reference actual numbers.
- Provide 2-4 strengths, 2-4 improvements, and 1-3 training recommendations.
- If the technician is a top performer, still identify areas for marginal improvement.
- Return ONLY valid JSON. No explanation outside the JSON."""

    try:
        message = claude_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )

        response_text = message.content[0].text.strip()
        insights = json.loads(response_text)

        return jsonify({
            "insights": insights,
            "context": {
                "companyAvg": GLOBAL_OVERALL_STATS,
                "jobTypeComparison": job_type_comparison,
                "regionAvgScore": region_avg_score,
                "regionPeerCount": len(region_peers),
            },
        })

    except json.JSONDecodeError:
        return jsonify({
            "insights": {
                "summary": response_text,
                "strengths": [],
                "improvements": [],
                "trainingRecommendations": [],
            },
            "context": {},
        })
    except anthropic.APIError as e:
        return jsonify({"error": f"AI service error: {str(e)}"}), 503


if __name__ == "__main__":
    print(f"Data loaded: "
          f"{len(data['technicians'])} technicians, "
          f"{len(data['jobs'])} jobs")
    app.run(debug=True, port=5000)
