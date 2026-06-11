import json
import os

qna_path = os.path.join("data", "qna.json")

# Load existing qna
with open(qna_path, 'r', encoding='utf-8') as f:
    qna_data = json.load(f)

# Define pain Q&A
pain_qna = {
    "questions": [
        "Why am I having pain during my period?",
        "How can I stop menstrual cramps?",
        "I'm having severe pain in my lower abdomen",
        "What helps with period pain?",
        "I'm having pain"
    ],
    "keywords": ["pain", "cramps", "ache", "hurts", "sore", "dysmenorrhea"],
    "is_direct": True,
    "category": "HEALTH",
    "answer": "Period pain (dysmenorrhea) is caused by your uterus contracting to shed its lining. These contractions are triggered by hormone-like substances called prostaglandins.\n\n**Here is what you can do to relieve it:**\n1. **Heat Therapy:** Apply a heating pad or hot water bottle to your lower abdomen or back.\n2. **Pain Relief:** Over-the-counter NSAIDs like Ibuprofen or Naproxen are very effective. Take them with food.\n3. **Hydration & Diet:** Drink plenty of water or chamomile tea. Magnesium-rich foods (like dark chocolate and spinach) can also help relax muscles.\n4. **Light Exercise:** Gentle yoga, walking, or stretching can increase blood flow and reduce pain.\n\n*If your pain is extremely severe, prevents you from doing daily activities, or isn't relieved by medication, please consult a gynecologist as it could be a sign of an underlying condition like endometriosis.*"
}

# Add to the beginning of the QnA data (or end, but let's just append)
qna_data.append(pain_qna)

# Save back to file
with open(qna_path, 'w', encoding='utf-8') as f:
    json.dump(qna_data, f, indent=4, ensure_ascii=False)

print("Pain Q&A added successfully!")
