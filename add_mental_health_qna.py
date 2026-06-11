import json

filepath = r"c:\Users\KIIT\Downloads\MAA (1)\MAA\data\qna.json"

new_entries = [
    {
        "questions": [
            "How does the menstrual cycle affect mental health?",
            "Mental health during period",
            "Periods and mental health",
            "Why do I feel sad or depressed during my period?",
            "Does period affect mental health?"
        ],
        "answer": "Hormonal fluctuations during your menstrual cycle, especially changes in estrogen and progesterone, can significantly impact your mood and mental health. It is very common to experience mood swings, irritability, sadness, or anxiety in the days leading up to and during your period. Getting enough rest, staying hydrated, eating a balanced diet, and practicing self-care can help. However, if these feelings are severe or overwhelming, please consult a healthcare professional.",
        "keywords": [
            "mental health",
            "depression",
            "anxiety",
            "sad",
            "mood swings",
            "emotional",
            "mental",
            "crying",
            "depressed",
            "mood"
        ],
        "category": "Mental Health",
        "is_direct": True
    },
    {
        "questions": [
            "What is PMDD?",
            "Severe depression before period",
            "Premenstrual dysphoric disorder",
            "Extreme mood swings before period"
        ],
        "answer": "Premenstrual dysphoric disorder (PMDD) is a condition similar to PMS but much more severe. PMDD causes severe irritability, depression, or anxiety in the week or two before your period starts. Symptoms usually go away two to three days after your period starts. If your mood changes severely disrupt your daily life or if you suspect you have PMDD, it is highly recommended to speak with a doctor or mental health professional.",
        "keywords": [
            "pmdd",
            "severe depression",
            "severe anxiety",
            "suicidal thoughts",
            "extreme mood swings",
            "dysphoric",
            "mental illness"
        ],
        "category": "Mental Health",
        "is_direct": True
    },
    {
        "questions": [
            "How to manage mood swings during periods?",
            "Remedies for period sadness",
            "How to feel better emotionally during period?"
        ],
        "answer": "To manage mood swings and emotional dips during your period, try engaging in light exercise (like walking or yoga) which releases endorphins. Ensure you're getting 7-9 hours of sleep, eating nutrient-rich foods (limit caffeine and sugar), and practicing stress-reduction techniques like meditation or deep breathing. Talking to a friend or simply allowing yourself time to rest can also be very helpful.",
        "keywords": [
            "manage mood",
            "feel better",
            "emotional support",
            "yoga for mood",
            "mental peace",
            "reduce stress"
        ],
        "category": "Mental Health",
        "is_direct": True
    }
]

with open(filepath, 'r', encoding='utf-8') as f:
    data = json.load(f)

data.extend(new_entries)

with open(filepath, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print("Mental health entries added successfully.")
