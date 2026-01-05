import json
import random
import os
from typing import List, Dict, Any, Optional
from config import settings

class QuestionBankService:
    BANK_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "banks")

    @staticmethod
    def load_bank(bank_name: str) -> List[Dict[str, Any]]:
        """Loads a JSON bank file by name (e.g., 'jumble.json')."""
        file_path = os.path.join(QuestionBankService.BANK_DIR, bank_name)
        if not os.path.exists(file_path):
            print(f"Bank not found: {file_path}")
            return []
        
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
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
            "mcq-reading": "mcq_reading.json"
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
            
            # 4. Jumble
            elif section_type == "jumble":
                q_structure["content"] = {
                    "sentence": item.get("content")
                }
                q_structure["grading_config"] = {
                    "correct_answer": item.get("correct_answer")
                }
            
            # 5. MCQ (Grammar / Reading / Context)
            elif section_type.startswith("mcq"):
                q_structure["content"] = {
                    "question": item.get("content") or item.get("question_text"), # mcq_reading uses question_text
                    "options": item.get("options")
                }
                q_structure["grading_config"] = {
                    "correct_answer": item.get("correct_answer")
                }

            generated_questions.append(q_structure)
            
        return generated_questions
