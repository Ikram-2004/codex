def calculate_final_score(website_score, app_score, code_score):
    scores = []
    weights = []

    if website_score is not None:
        scores.append(website_score * 0.4)
        weights.append(0.4)
    if app_score is not None:
        scores.append(app_score * 0.35)
        weights.append(0.35)
    if code_score is not None:
        scores.append(code_score * 0.25)
        weights.append(0.25)

    if not scores:
        return {
            "score": 0,
            "grade": "F",
            "message": "No valid URLs provided",
            "color": "red",
            "surfaces_scanned": 0
        }

    total_weight = sum(weights)
    final = round(sum(scores) / total_weight)
    scanned_surfaces = len(scores)

    if final >= 90:
        grade, color = "A", "green"
        message = "Excellent security posture — industry best practice"
    elif final >= 75:
        grade, color = "B", "teal"
        message = "Good security — a few improvements recommended"
    elif final >= 55:
        grade, color = "C", "amber"
        message = "Average security — several issues need attention"
    elif final >= 35:
        grade, color = "D", "orange"
        message = "Poor security — fix HIGH issues urgently"
    else:
        grade, color = "F", "red"
        message = "Critical vulnerabilities found — act immediately"

    if scanned_surfaces == 1:
        message += " (website only — add app & repo URLs for full picture)"
    elif scanned_surfaces == 2:
        message += " (2 of 3 surfaces scanned)"

    return {
        "score": final,
        "grade": grade,
        "message": message,
        "color": color,
        "surfaces_scanned": scanned_surfaces
    }