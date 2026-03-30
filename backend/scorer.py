def calculate_final_score(website_score, app_score, code_score):
    """
    Combines 3 surface scores into one final weighted score.
    """
    final = (website_score * 0.4) + (app_score * 0.35) + (code_score * 0.25)
    final = round(final)

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