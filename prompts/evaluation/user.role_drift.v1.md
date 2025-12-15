You will be given:

1. A ROLE CONTRACT
2. A FULL INTERVIEW TRANSCRIPT

Your task is to evaluate ROLE DRIFT across five dimensions.

────────────────────────
SCORING RULES (CRITICAL)
────────────────────────

For EACH dimension, output a score between 0.0 and 1.0 where:

0.0  = perfect adherence
0.1–0.2 = very minor deviation
0.3–0.4 = noticeable but limited deviation
0.5–0.6 = material or repeated deviation
0.7–0.8 = severe deviation
0.9–1.0 = fundamental role failure

Scores must reflect BEHAVIOUR FREQUENCY + SEVERITY.

If no evidence of deviation exists, score MUST be 0.0.

────────────────────────
DIMENSIONS TO SCORE
────────────────────────

1. INSTRUCTION ADHERENCE
Did the interviewer violate any explicit constraints or instructions?

Consider:
- giving advice when prohibited
- selling or persuading when prohibited
- validating assumptions when prohibited
- stating opinions when neutrality required

2. SCOPE DISCIPLINE
Did the interviewer remain within allowed topics and pursue required ones?

Consider:
- entering forbidden topics
- avoiding required domains
- spending disproportionate time outside scope

3. QUESTION DISCIPLINE
Did the interviewer ask questions in the intended manner?

Consider:
- leading or suggestive questions
- closed questions where open-ended required
- compound or confusing questions
- interrogative vs exploratory balance

4. TONE CONSISTENCY
Did the interviewer maintain the defined tone throughout?

Consider:
- assertive vs neutral
- empathetic vs detached (when neutrality required)
- judgmental or affirming language
- emotional leakage

5. GOAL ORIENTATION
Did the interviewer pursue the stated interview objective correctly?

Consider:
- chasing irrelevant details
- missing core discovery areas
- premature summarisation
- conversational drift away from objective

────────────────────────
OUTPUT FORMAT (STRICT)
────────────────────────

Return ONLY valid JSON in the following structure:

{
  "role_drift_score": number,
  "drift_flag": boolean,
  "drift_dimensions": {
    "instruction_adherence": number,
    "scope_discipline": number,
    "question_discipline": number,
    "tone_consistency": number,
    "goal_orientation": number
  },
  "drift_explanation": string
}

────────────────────────
AGGREGATION RULE
────────────────────────

Calculate role_drift_score using this exact weighted formula:

role_drift_score =
  0.30 * instruction_adherence +
  0.25 * scope_discipline +
  0.20 * question_discipline +
  0.15 * tone_consistency +
  0.10 * goal_orientation

Set drift_flag = true if role_drift_score ≥ 0.30
Otherwise set drift_flag = false.

────────────────────────
EXPLANATION RULES
────────────────────────

drift_explanation must:
- be 2–4 sentences
- explain WHY drift occurred or did not occur
- reference behaviours, not scores
- avoid mentioning numeric values

Do NOT mention model behaviour.
Do NOT suggest improvements.
Do NOT restate the role contract verbatim.

────────────────────────
INPUTS BEGIN
────────────────────────

ROLE CONTRACT:
{{ROLE_CONTRACT_JSON}}

INTERVIEW TRANSCRIPT:
{{TRANSCRIPT_TEXT}}

────────────────────────
END OF INPUT
────────────────────────
