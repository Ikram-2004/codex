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
            "color": "red"
        }

    # Normalize so weights always add up to 1
    total_weight = sum(weights)
    final = round(sum(scores) / total_weight)

    if final >= 85:
        grade = "A"
        message = "Well secured — keep monitoring regularly"
        color = "green"
    elif final >= 70:
        grade = "B"
        message = "Good posture — a few improvements needed"
        color = "teal"
    elif final >= 55:
        grade = "C"
        message = "Moderate risk — take action soon"
        color = "amber"
    elif final >= 40:
        grade = "D"
        message = "High risk — fix critical issues urgently"
        color = "orange"
    else:
        grade = "F"
        message = "Critical vulnerabilities found — act now"
        color = "red"

    return {
        "score": final,
        "grade": grade,
        "message": message,
        "color": color
    }