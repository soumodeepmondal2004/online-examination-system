import os
import json
import fitz  # PyMuPDF
import numpy as np
from typing import List, Dict, Optional
from google import genai
from openai import OpenAI
from app.core.config import settings

# --- PDF TEXT EXTRACTOR ---

def extract_text_from_pdf(file_path: str) -> str:
    """Extract all text pages from PDF using PyMuPDF."""
    text = ""
    try:
        doc = fitz.open(file_path)
        for page in doc:
            text += page.get_text() + "\n"
        doc.close()
    except Exception as e:
        print(f"Error reading PDF {file_path}: {e}")
    return text

# --- EMBEDDINGS WRAPPER ---

def get_embedding(text: str) -> List[float]:
    """Generate text embeddings using Gemini or OpenAI. Fallback to random floats if keys are missing."""
    # 1. Try Google Gemini
    if settings.GEMINI_API_KEY:
        try:
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            response = client.models.embed_content(
                model="text-embedding-004",
                contents=text
            )
            return response.embeddings[0].values
        except Exception as e:
            print(f"Gemini embedding error: {e}")
            
    # 2. Try OpenAI
    if settings.OPENAI_API_KEY:
        try:
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            response = client.embeddings.create(
                input=[text],
                model="text-embedding-3-small"
            )
            return response.data[0].embedding
        except Exception as e:
            print(f"OpenAI embedding error: {e}")
            
    # 3. Fail-safe mock embedding (128-dim normalized vector)
    # We use a simple hash of the text to seed numpy so that same text gets same mock embedding
    seed = sum(ord(c) for c in text) % 10000
    rng = np.random.default_rng(seed)
    vec = rng.standard_normal(128)
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
    return vec.tolist()

# --- LIGHTWEIGHT VECTOR STORE ---

class VectorStore:
    """In-memory numpy-based vector store for RAG."""
    def __init__(self, index_name: str):
        self.index_name = index_name
        self.chunks: List[str] = []
        self.embeddings: List[List[float]] = []
        
    def add_texts(self, texts: List[str]):
        for t in texts:
            if not t.strip():
                continue
            emb = get_embedding(t)
            self.chunks.append(t)
            self.embeddings.append(emb)
            
    def similarity_search(self, query: str, k: int = 3) -> List[str]:
        if not self.chunks:
            return []
        query_emb = np.array(get_embedding(query))
        db_embs = np.array(self.embeddings)
        
        # Calculate cosine similarities
        dots = np.dot(db_embs, query_emb)
        norms = np.linalg.norm(db_embs, axis=1) * np.linalg.norm(query_emb)
        similarities = dots / (norms + 1e-9)
        
        # Get top-k indices
        top_k_indices = np.argsort(similarities)[::-1][:k]
        return [self.chunks[idx] for idx in top_k_indices]

# Helper to chunk text
def chunk_text(text: str, chunk_size: int = 500, overlap: int = 100) -> List[str]:
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size - overlap):
        chunk = " ".join(words[i:i + chunk_size])
        if chunk:
            chunks.append(chunk)
    return chunks

# Store instances map { material_id: VectorStore }
vector_db_cache: Dict[int, VectorStore] = {}

def index_pdf_document(material_id: int, file_path: str):
    """Chunk and index study PDF."""
    raw_text = extract_text_from_pdf(file_path)
    chunks = chunk_text(raw_text)
    
    store = VectorStore(index_name=f"material_{material_id}")
    store.add_texts(chunks)
    vector_db_cache[material_id] = store

# --- CHAT & PROMPT GENERATOR ---

def chat_with_document(material_id: int, user_query: str) -> str:
    """Retrieve chunks and send prompt to LLM."""
    # Retrieve relevant context
    store = vector_db_cache.get(material_id)
    context = ""
    if store:
        matched_chunks = store.similarity_search(user_query, k=3)
        context = "\n---\n".join(matched_chunks)
        
    # Build RAG system prompt
    system_prompt = (
        "You are an AI Study Assistant. Answer the student's question based strictly on the provided context from their lecture PDF notes.\n"
        "If you do not know the answer or if the answer is not in the context, say 'I cannot find the answer in the uploaded notes, but I will answer using my general knowledge: ' followed by your general explanation.\n\n"
        f"CONTEXT:\n{context}\n\n"
        f"STUDENT QUESTION:\n{user_query}"
    )

    # 1. Try Google Gemini
    if settings.GEMINI_API_KEY:
        try:
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=system_prompt
            )
            return response.text
        except Exception as e:
            print(f"Gemini API error: {e}")

    # 2. Try OpenAI
    if settings.OPENAI_API_KEY:
        try:
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": system_prompt}]
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"OpenAI API error: {e}")

    # 3. Fallback mock response
    return (
        f"Simulated AI Response (API key not configured):\n"
        f"Retrieved {len(context.split('---'))} relevant paragraphs from PDF. "
        f"Your question was: '{user_query}'"
    )

# --- SUMMARY & MCQS GENERATOR ---

def summarize_document(material_id: int) -> str:
    """Generate summary of the document using LLM."""
    store = vector_db_cache.get(material_id)
    if not store or not store.chunks:
        return "No text parsed in document."
        
    # Take first few chunks as representative context
    context = "\n---\n".join(store.chunks[:4])
    prompt = (
        "You are an expert professor. Write a concise, structured summary (bullet points, key concepts) of the following class lecture notes:\n\n"
        f"{context}"
    )

    if settings.GEMINI_API_KEY:
        try:
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            return response.text
        except Exception as e:
            print(e)
            
    if settings.OPENAI_API_KEY:
        try:
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}]
            )
            return response.choices[0].message.content

        except Exception as e:
            print(e)

    return (
        "Mock Lecture Summary (API key not configured):\n"
        "- Key Concept 1: Core concepts and theoretical foundations.\n"
        "- Key Concept 2: Performance metrics and empirical analysis.\n"
        "- Key Concept 3: Practical implementations, modules, and testing suites."
    )

def generate_document_quiz(material_id: int) -> List[Dict]:
    """Generate 5 multiple choice questions (MCQ) from PDF."""
    store = vector_db_cache.get(material_id)
    if not store or not store.chunks:
        return []
        
    context = "\n---\n".join(store.chunks[:3])
    prompt = (
        "Generate exactly 5 Multiple Choice Questions (MCQ) based on the following lecture content. "
        "Your output must be a valid JSON array, containing objects with keys: 'question', 'options', and 'answer'. "
        "The 'options' key must be an object with keys: 'A', 'B', 'C', 'D'. "
        "The 'answer' key must be a single character string ('A', 'B', 'C', or 'D') indicating the correct option. "
        "Do not include markdown tags (like ```json) in your response.\n\n"
        f"CONTENT:\n{context}"
    )

    if settings.GEMINI_API_KEY:
        try:
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            # Remove markdown backticks if returned
            text = response.text.replace("```json", "").replace("```", "").strip()
            return json.loads(text)
        except Exception as e:
            print(f"Gemini Quiz error: {e}")
            
    if settings.OPENAI_API_KEY:
        try:
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}]
            )
            text = response.choices[0].message.content.replace("```json", "").replace("```", "").strip()
            return json.loads(text)
        except Exception as e:
            print(f"OpenAI Quiz error: {e}")

    # Fallback mock quiz
    return [
        {
            "question": "Which time complexity represents binary search algorithm?",
            "options": {"A": "O(N)", "B": "O(N log N)", "C": "O(log N)", "D": "O(1)"},
            "answer": "C"
        },
        {
            "question": "What is the primary role of a Vector Database in a RAG pipeline?",
            "options": {"A": "To compress files", "B": "To index and retrieve text embeddings", "C": "To write code", "D": "To render UI buttons"},
            "answer": "B"
        },
        {
            "question": "Which metric is commonly predicted by the Student Classifier model?",
            "options": {"A": "Uptime", "B": "Gaze deviations", "C": "Academic failure risk", "D": "Webcam frame rate"},
            "answer": "C"
        }
    ]
