import os

import httpx
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

client = genai.Client(api_key=api_key)

SYSTEM_PROMPT = """
You are a school assistant chatbot. Answer all questions using the school’s student handbook as your primary source of truth. 
When the handbook does not explicitly cover a situation, use general school rules, common sense, and typical educational policies to give a helpful and reasonable answer. 
Always stay polite, clear, and supportive. If something is not allowed or not defined, explain it simply and guide the student toward the proper school procedure.
"""

doc_url = "https://rjtiibjejbnubuteheph.supabase.co/storage/v1/object/public/EDIQ-bucket/Student%20Handbook%20(1).pdf"

doc_data = httpx.get(doc_url).content


def student_handbook(message):
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            types.Part.from_bytes(
                data=doc_data,
                mime_type="application/pdf",
            ),
            message,
        ],
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            max_output_tokens=500,
        ),
    )

    return response.text
