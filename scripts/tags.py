import os
import requests
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types
from google.genai.types import GenerateContentConfig 


OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "qwen3.5:latest"
GEMINI_MODEL = "gemini-2.5-flash"
SYSTEM_INSTRUCTION = "Transform the prompt into a professional of a job listing related to the prompt. The output should be in Romanian. The output should be concise and to the point, without any unnecessary information. The output should be in a format that can be easily parsed, with each piece of information on a new line. Dont include any salary information, just the job description and requirements. The output should be in a format that can be easily parsed, with each piece of information on a new line. Dont include any salary information, just the job description and requirements."

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)
api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

prompt = "Ingrijitor persoane in varsta" # fa l sa ia inputul din textboxu de la descriere, ar fi bine daca te ai asigura ca descriere contine 

def generate_with_ollama(prompt: str) -> str:
    payload = {
        "model": OLLAMA_MODEL,
        "system": SYSTEM_INSTRUCTION,
        "prompt": prompt,
        "options": {
            "think": False
        },
        "stream": False,
        "keep_alive": -1
    }
    response = requests.post(OLLAMA_URL, json=payload, timeout=120)
    response.raise_for_status()
    data = response.json()
    text = data.get("response", "").strip()
    return text

def generate_with_gemini(prompt: str) -> str:
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            temperature=0.2,
        ),
    )
    text = (response.text or "").strip()
    return text

try:
    result = generate_with_ollama(prompt)
except Exception as ollama_error:
    try:
        result = generate_with_gemini(prompt)
        print("Gemini result:", result)
    except Exception as gemini_error:
        print("Bag pl nu merge nimic")