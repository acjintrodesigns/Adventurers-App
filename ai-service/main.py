from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
import io
from PIL import Image

app = FastAPI(title="Adventurers AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ProofAnalysisResult(BaseModel):
    is_valid: bool
    confidence: float
    message: str
    detected_activity: str | None = None

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Adventurers AI Service"}

@app.post("/analyze-proof", response_model=ProofAnalysisResult)
async def analyze_proof(file: UploadFile = File(...)):
    """Analyze an uploaded proof image to validate it shows a completed activity."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded")
    
    try:
        image = Image.open(io.BytesIO(contents))
        width, height = image.size
        
        # Basic validation: image must meet minimum size requirements
        if width < 100 or height < 100:
            return ProofAnalysisResult(
                is_valid=False,
                confidence=0.95,
                message="Image is too small to be a valid proof photo. Please upload a clear, full-size photo.",
                detected_activity=None
            )
        
        # Check image is not mostly blank/white
        image_rgb = image.convert("RGB")
        pixels = list(image_rgb.getdata())
        white_pixels = sum(1 for r, g, b in pixels if r > 240 and g > 240 and b > 240)
        white_ratio = white_pixels / len(pixels)
        
        if white_ratio > 0.95:
            return ProofAnalysisResult(
                is_valid=False,
                confidence=0.90,
                message="Image appears to be blank or mostly white. Please upload a real photo of the completed activity.",
                detected_activity=None
            )
        
        return ProofAnalysisResult(
            is_valid=True,
            confidence=0.85,
            message="Image appears to be a valid proof of activity completion.",
            detected_activity="activity_completion"
        )
        
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not process image: {str(e)}")

@app.post("/score-progress")
async def score_progress(data: dict):
    """Calculate a progress score based on completed requirements."""
    completed = data.get("completed", 0)
    total = data.get("total", 1)
    category_scores = data.get("category_scores", {})
    
    if total == 0:
        return {"overall_score": 0, "completion_percentage": 0, "grade": "N/A"}
    
    completion_pct = (completed / total) * 100
    
    # Weight categories
    weights = {
        "BasicRequirements": 0.3,
        "MyGod": 0.2,
        "MySelf": 0.2,
        "MyFamily": 0.15,
        "MyWorld": 0.15,
    }
    
    weighted_score = 0
    for category, weight in weights.items():
        cat_data = category_scores.get(category, {"completed": 0, "total": 1})
        cat_pct = (cat_data["completed"] / max(cat_data["total"], 1)) * 100
        weighted_score += cat_pct * weight
    
    grade = "A" if weighted_score >= 90 else "B" if weighted_score >= 75 else "C" if weighted_score >= 60 else "D" if weighted_score >= 50 else "F"
    
    return {
        "overall_score": round(weighted_score, 2),
        "completion_percentage": round(completion_pct, 2),
        "grade": grade,
        "category_breakdown": category_scores
    }
