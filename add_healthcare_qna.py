import json

filepath = r"c:\Users\KIIT\Downloads\MAA (1)\MAA\data\qna.json"

new_entry = {
    "questions": [
        "Healthcare during periods",
        "How to take care of myself during my period?",
        "General health advice for menstruation",
        "Period self care",
        "Menstrual healthcare tips",
        "How to maintain health during period"
    ],
    "answer": "During your period, focusing on your general health and self-care is very important. Here are some key tips:\n\n1. **Hygiene:** Change your pad, tampon, or menstrual cup regularly (every 4-6 hours) to prevent bacterial infections like BV or TSS. Wash your genital area with warm water (avoid harsh soaps).\n2. **Pain Management:** Over-the-counter pain relievers (like Ibuprofen or Meftal-Spas) and heat therapy (heating pad) can help ease cramps.\n3. **Diet & Hydration:** Drink plenty of water to reduce bloating. Eat foods rich in iron (spinach, beans, jaggery) to replenish blood loss, and magnesium (dark chocolate) to relax muscles.\n4. **Rest & Movement:** Listen to your body. Getting enough sleep is crucial, but light exercises like walking or yoga can also help boost endorphins and relieve pain.\n\n*If you experience unusually heavy bleeding, debilitating pain, or periods lasting longer than 7 days, please consult a gynecologist or healthcare professional.*",
    "keywords": [
        "healthcare",
        "health",
        "care",
        "self care",
        "advice",
        "hygiene",
        "tips",
        "management",
        "treatment",
        "doctor",
        "healthy"
    ],
    "category": "General",
    "is_direct": True
}

with open(filepath, 'r', encoding='utf-8') as f:
    data = json.load(f)

data.append(new_entry)

with open(filepath, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=4)

print("Healthcare Q&A added successfully.")
