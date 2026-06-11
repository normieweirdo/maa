import json

filepath = r"c:\Users\KIIT\Downloads\MAA (1)\MAA\data\qna.json"

new_entry = {
    "questions": [
        "Why am I vomiting during my period?",
        "Nausea during periods",
        "Throwing up on period",
        "Vomiting and cramps",
        "Is it normal to feel nauseous during menstruation?"
    ],
    "answer": "Feeling nauseous or vomiting during your period is quite common. It is primarily caused by **prostaglandins**—the same hormone-like chemicals that cause menstrual cramps. When your body produces excess prostaglandins, they can enter your bloodstream and affect your digestive system, leading to nausea, vomiting, or diarrhea.\n\n**Here is how you can manage it:**\n1. **Pain Relievers:** Over-the-counter NSAIDs like Ibuprofen reduce prostaglandin levels, which helps relieve both cramps and nausea.\n2. **Ginger:** Ginger tea or ginger candies are highly effective and natural ways to settle an upset stomach.\n3. **Hydration & Bland Foods:** Take small sips of water, peppermint tea, or clear broths. Stick to bland, easily digestible foods (like crackers or toast) until you feel better.\n4. **Heat Therapy:** Placing a heating pad on your stomach can soothe cramps and reduce the feeling of nausea.\n\n*If your vomiting is severe, prevents you from keeping fluids down, or is accompanied by intense pelvic pain (which could indicate conditions like endometriosis), please see a healthcare professional immediately.*",
    "keywords": [
        "vomit",
        "vomiting",
        "vomitting",
        "nausea",
        "nauseous",
        "throwing up",
        "puke",
        "puking",
        "sick",
        "stomach upset",
        "diarrhea"
    ],
    "category": "Symptoms",
    "is_direct": True
}

with open(filepath, 'r', encoding='utf-8') as f:
    data = json.load(f)

data.append(new_entry)

with open(filepath, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=4)

print("Nausea/Vomiting Q&A added successfully.")
