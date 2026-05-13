#!/usr/bin/env python3
"""
migrate_banks.py  —  One-shot migration script.
Run from:  /Users/chirkut/Desktop/Autonex Ai Evaluator copy/backend/
  python3 migrate_banks.py
"""

import json, os, shutil

BASE   = os.path.dirname(os.path.abspath(__file__))
PARENT = os.path.dirname(BASE)

SRC = {
    1: os.path.join(BASE, "public", "Image", "Section1"),
    2: os.path.join(BASE, "public", "Image", "Section2"),
    3: os.path.join(BASE, "public", "Image", "Section3"),
}
DST = {
    1: os.path.join(BASE, "static", "images", "section1"),
    2: os.path.join(BASE, "static", "images", "section2"),
    3: os.path.join(BASE, "static", "images", "section3"),
}
JSON_SRC = {
    1: os.path.join(PARENT, "Section1.json"),
    2: os.path.join(PARENT, "Section2.json"),
    3: os.path.join(PARENT, "Section3.json"),
}
BANK_DIR    = os.path.join(BASE, "data", "banks")
WOVEN_BANK  = os.path.join(BANK_DIR, "woven_test.json")
WOVEN2_BANK = os.path.join(BANK_DIR, "woven2_test.json")


# ── helpers ──────────────────────────────────────────────────────────────────

def copy_images(section_num):
    src_dir = SRC[section_num]
    dst_dir = DST[section_num]
    os.makedirs(dst_dir, exist_ok=True)

    mapping = {}
    for f in os.listdir(src_dir):
        full = os.path.join(src_dir, f)
        if os.path.isfile(full):
            mapping[f.lower()] = full

    for src_name, src_path in mapping.items():
        stem, ext = os.path.splitext(src_name)
        dst_name = stem + (ext if ext else ".png")
        shutil.copy2(src_path, os.path.join(dst_dir, dst_name))
        # Also ensure any file with no extension gets a .png copy
        if not ext:
            pass  # already handled above

    print(f"  Section{section_num}: copied {len(mapping)} images → static/images/section{section_num}/")


def img_url(section_num, filename):
    if not filename:
        return None
    stem, ext = os.path.splitext(filename.lower())
    return f"/static/images/section{section_num}/{stem}{ext if ext else '.png'}"


# ── Section 1 → image-count ───────────────────────────────────────────────────

def build_section1():
    data = json.load(open(JSON_SRC[1]))
    bank = []
    for q in data:
        bank.append({
            "id"             : f"s1_{q['id']:03d}",
            "question_number": q["id"],
            "type"           : "image-count",
            "marks"          : 5,
            "image_url"      : img_url(1, q.get("image_filename", "")),
            "title"          : q["question"],
            "correct_answer" : q["answer"],
            "tolerance"      : 0,
            "difficulty"     : "medium",
            "tags"           : ["counting", "woven-s1"]
        })
    print(f"  Section1: {len(bank)} image-count questions")
    return bank


# ── Section 2 → mcq-image ─────────────────────────────────────────────────────

def build_section2():
    data = json.load(open(JSON_SRC[2]))
    bank = []
    for q in data:
        guideline = q.get("note") or None
        if q.get("guidelines"):
            parts = [f"{k}: {v}" for k, v in q["guidelines"].get("front_determination_method", {}).items()]
            guideline = " | ".join(parts)
        bank.append({
            "id"                 : f"s2_{q['id']:03d}",
            "question_number"    : q["id"],
            "type"               : "mcq-image",
            "marks"              : 4,
            "image_url"          : img_url(2, q.get("image_filename", "")),
            "guideline"          : guideline,
            "scenario"           : None,
            "title"              : q["question"],
            "options"            : q["options"],
            "correct_answer"     : q["correct_answer"],
            "correct_answer_text": q.get("correct_answer_text", ""),
            "difficulty"         : "medium",
            "tags"               : ["object-class", "woven-s2"]
        })
    print(f"  Section2: {len(bank)} mcq-image questions")
    return bank


# ── Section 3 → mcq-annotation ───────────────────────────────────────────────
# Q3 (mcq_multi_image with per-image answers) → ONE bank entry, type "mcq-multi-image"
# Q8 (mcq_multi_image with single answer)     → ONE bank entry, type "mcq-multi-image"
# Everything else → single mcq-image entry

def build_section3():
    data = json.load(open(JSON_SRC[3]))
    bank = []

    for q in data:
        qid   = q["id"]
        qtype = q.get("type", "mcq")
        opts  = q.get("options", {})
        guide = q.get("guideline", "")
        scen  = q.get("scenario") or q.get("situation") or ""
        title = q.get("question", "") or "Answer based on the guidelines."
        imgs  = q.get("image_filename", [])

        # ── multi-image: keep as ONE question ─────────────────────────────
        if qtype == "mcq_multi_image":
            # Build per-image list with correct answers
            if "correct_answers" in q:
                # Q3-style: each image has its own answer
                sub_images = [
                    {
                        "url"           : img_url(3, ca["image_filename"]),
                        "correct_answer": ca["correct_answer"],
                        "correct_answer_text": ca.get("correct_answer_text", "")
                    }
                    for ca in q["correct_answers"]
                ]
            else:
                # Q8-style: all images share one answer
                single_ans  = q["correct_answer"]
                single_text = q.get("correct_answer_text", "")
                sub_images = [
                    {"url": img_url(3, f), "correct_answer": single_ans, "correct_answer_text": single_text}
                    for f in imgs
                ]

            bank.append({
                "id"                 : f"s3_{qid:03d}",
                "question_number"    : qid,
                "type"               : "mcq-multi-image",
                "marks"              : 4,           # 4 marks per sub-image
                "guideline"          : guide,
                "scenario"           : scen or None,
                "title"              : title,
                "note"               : q.get("note"),
                "options"            : opts,
                "sub_images"         : sub_images,   # list: [{url, correct_answer}]
                "difficulty"         : "medium",
                "tags"               : ["annotation", "multi-image", "woven-s3"]
            })
            continue

        # ── single image or no image ───────────────────────────────────────
        img = img_url(3, imgs[0]) if isinstance(imgs, list) and imgs else None

        bank.append({
            "id"                 : f"s3_{qid:03d}",
            "question_number"    : qid,
            "type"               : "mcq-image",
            "marks"              : 4,
            "image_url"          : img,
            "guideline"          : guide,
            "scenario"           : scen or None,
            "title"              : title,
            "options"            : opts,
            "correct_answer"     : q["correct_answer"],
            "correct_answer_text": q.get("correct_answer_text", ""),
            "difficulty"         : "medium",
            "tags"               : ["annotation", "woven-s3"]
        })

    print(f"  Section3: {len(bank)} questions ({sum(1 for q in bank if q['type']=='mcq-multi-image')} multi-image)")
    return bank


# ── main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("\n=== Migrating images ===")
    for n in (1, 2, 3):
        copy_images(n)

    print("\n=== Building bank files ===")
    s1 = build_section1()
    s2 = build_section2()
    s3 = build_section3()

    # woven_test.json  = Section1 (image-count) + Section2 (mcq-image)
    woven = s1 + s2
    with open(WOVEN_BANK, "w") as f:
        json.dump(woven, f, indent=2)
    print(f"\n  Wrote woven_test.json  ({len(woven)} questions)")

    # woven2_test.json = Section3 (mcq-annotation, 21 questions)
    with open(WOVEN2_BANK, "w") as f:
        json.dump(s3, f, indent=2)
    print(f"  Wrote woven2_test.json ({len(s3)} questions)")

    print(f"\n✅  Done!")
    print(f"   Section1: {len(s1)} image-count  (10 Qs)")
    print(f"   Section2: {len(s2)} mcq-image    (10 Qs)")
    print(f"   Section3: {len(s3)} mcq-annotation (21 Qs, 2 are multi-image)")
