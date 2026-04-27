import json
import random
import os
from typing import List, Dict, Any, Optional
from config import settings

class QuestionBankService:
    BANK_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "banks")

    @staticmethod
    def load_bank(bank_name: str) -> List[Dict[str, Any]]:
        """Loads a JSON bank file by name (e.g., 'jumble.json').
        Handles both flat arrays and nested {questions: [...]} format.
        """
        file_path = os.path.join(QuestionBankService.BANK_DIR, bank_name)
        if not os.path.exists(file_path):
            print(f"Bank not found: {file_path}")
            return []
        
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                
            # Handle nested format: {"set_name": "...", "questions": [...]}
            if isinstance(data, dict) and "questions" in data:
                return data["questions"]
            # Handle flat array format: [{...}, {...}]
            elif isinstance(data, list):
                return data
            else:
                print(f"Unexpected format in {bank_name}")
                return []
        except Exception as e:
            print(f"Error loading bank {bank_name}: {e}")
            return []

    @staticmethod
    def generate_questions(
        section_type: str, 
        count: int, 
        marks_per_question: int
    ) -> List[Dict[str, Any]]:
        """
        Selects 'count' random questions from the specified section's bank.
        Applies 'marks_per_question' to each.
        """
        bank_map = {
            "video": "video.json",
            "image": "image.json",
            "reading": "reading.json",
            "jumble": "jumble.json",
            "mcq-grammar": "mcq_grammar.json",
            "mcq-context": "mcq_context.json",
            "mcq-reading": "mcq_reading.json",
            "typing": "typing.json",
            "typing-easy": "typing_easy.json",
            "typing-advanced": "typing_advanced.json",
        }

        filename = bank_map.get(section_type)
        if not filename:
            return []

        # Load bank data
        all_items = QuestionBankService.load_bank(filename)
        if not all_items:
            return []

        # Random Selection
        # If requested count > available, take all available (or duplicate if really needed? No, let's max out at available)
        selected_items = []
        if count >= len(all_items):
            selected_items = all_items
        else:
            selected_items = random.sample(all_items, count)

        # Transform to internal Question Question schema structure
        generated_questions = []
        
        for item in selected_items:
            q_structure = {
                "question_type": section_type,
                "marks": marks_per_question,
                "content": {},
                "grading_config": {}
            }
            
            # Map specific bank fields to standard JSONB columns
            
            # 1. Video
            if section_type == "video":
                q_structure["content"] = {
                    "url": item.get("video_url"),
                    "title": item.get("title") or item.get("prompt", "Video description task")  # Fallback to prompt
                }
                q_structure["grading_config"] = {
                    "reference": item.get("reference_context") or item.get("correct_answer", ""),  # Fallback to correct_answer
                    "key_ideas": item.get("key_ideas") or list(item.get("key_elements", {}).values()) or []
                }
                
            # 2. Image
            elif section_type == "image":
                q_structure["content"] = {
                    "url": item.get("image_url") or item.get("video_url"),  # Fallback in case of wrong field
                    "title": item.get("title") or item.get("prompt", "Image description task")  # Fallback to prompt
                }
                q_structure["grading_config"] = {
                    "reference": item.get("reference_context") or item.get("correct_answer", ""),  # Fallback to correct_answer
                    "key_ideas": item.get("key_ideas") or list(item.get("key_elements", {}).values()) or []
                }
                
            # 3. Reading (Summary)
            elif section_type == "reading":
                 q_structure["content"] = {
                    "passage": item.get("passage"),
                    "title": item.get("title")
                }
                 q_structure["grading_config"] = {
                    "reference": item.get("reference_summary"),
                    "key_ideas": item.get("key_ideas", [])
                }
            
            # 4. Jumble — shuffle letter assignments so answer isn't always A B C D
            elif section_type == "jumble":
                original_jumble = item.get("jumble", {})
                original_answer = (item.get("answer") or item.get("correct_answer", "")).strip()

                # Get the correct sentence order from original answer
                answer_keys = original_answer.split()  # e.g. ["B", "A", "C", "D"]
                # Build ordered sentence parts in correct reading order
                ordered_parts = [original_jumble[k] for k in answer_keys if k in original_jumble]

                # Create new random letter assignment
                labels = list(original_jumble.keys())  # ["A", "B", "C", "D"]
                shuffled_labels = labels[:]
                random.shuffle(shuffled_labels)

                # Map: ordered_parts[i] -> shuffled_labels[i]
                # So the correct answer is shuffled_labels in order
                new_jumble = {}
                for i, part in enumerate(ordered_parts):
                    new_jumble[shuffled_labels[i]] = part
                new_correct = " ".join(shuffled_labels)  # e.g. "C A D B"

                parts_list = [f"{k}: {v}" for k, v in sorted(new_jumble.items())]
                sentence_display = " | ".join(parts_list) if parts_list else ""

                q_structure["content"] = {
                    "jumble": new_jumble,
                    "sentence": sentence_display
                }
                q_structure["grading_config"] = {
                    "correct_answer": new_correct
                }
            
            # 5. MCQ (Grammar / Reading / Context) — shuffle options
            elif section_type.startswith("mcq"):
                original_options = item.get("options", {})
                original_correct = item.get("correct_answer", "")
                correct_text = original_options.get(original_correct, "")

                # Shuffle: get all option texts, shuffle, reassign to A, B, C...
                option_keys = sorted(original_options.keys())  # ["A", "B", "C"]
                option_texts = [original_options[k] for k in option_keys]
                random.shuffle(option_texts)

                new_options = {}
                new_correct = original_correct
                for i, key in enumerate(option_keys):
                    new_options[key] = option_texts[i]
                    if option_texts[i] == correct_text:
                        new_correct = key

                if section_type == "mcq-reading":
                    q_structure["content"] = {
                        "passage": item.get("content"),
                        "question": item.get("question_text"),
                        "options": new_options
                    }
                else:
                    q_structure["content"] = {
                        "question": item.get("content") or item.get("question_text"),
                        "options": new_options
                    }
                q_structure["grading_config"] = {
                    "correct_answer": new_correct
                }

            # 6. Typing Speed (all variants)
            elif section_type in ("typing", "typing-easy", "typing-advanced"):
                # Determine grading mode from section type or difficulty field
                if section_type == "typing-easy":
                    grading_mode = "speed"
                elif section_type == "typing-advanced":
                    grading_mode = "accuracy"
                else:
                    grading_mode = "both"  # legacy

                q_structure["type"] = "typing"  # Frontend always renders as 'typing'
                q_structure["content"] = {
                    "passage": item.get("passage"),
                    "word_count": item.get("word_count"),
                    "time_limit": item.get("time_limit_seconds", 60),
                    "grading_mode": grading_mode,
                }
                q_structure["grading_config"] = {
                    "original_passage": item.get("passage"),
                    "time_limit": item.get("time_limit_seconds", 60),
                    "grading_mode": grading_mode,
                    "benchmark_wpm": 30,
                    "benchmark_accuracy": 90
                }

            generated_questions.append(q_structure)
            
        return generated_questions
