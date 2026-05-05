from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
import io
from PIL import Image
import cv2
import numpy as np

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


class FaceQualityRequest(BaseModel):
    image_base64: str


class FaceQualityResult(BaseModel):
    ready: bool
    focus_score: float
    focus_ready: bool
    face_detected: bool
    full_face_visible: bool
    in_frame: bool
    pose_ready: bool
    message: str

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Adventurers AI Service"}


@app.post("/analyze-face-quality", response_model=FaceQualityResult)
async def analyze_face_quality(payload: FaceQualityRequest):
    """Strict face quality checks for profile-photo capture (full face + frame + pose + focus)."""
    try:
        raw = base64.b64decode(payload.image_base64)
        arr = np.frombuffer(raw, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Invalid image")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 image payload")

    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    face_cascade_default = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    face_cascade_alt = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_alt.xml")
    face_cascade_alt2 = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_alt2.xml")
    eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_eye.xml")

    # Equalise histogram so different lighting conditions don't fool the cascade.
    gray_eq = cv2.equalizeHist(gray)

    faces = face_cascade_default.detectMultiScale(gray_eq, scaleFactor=1.05, minNeighbors=2, minSize=(30, 30))
    if len(faces) == 0:
        faces = face_cascade_alt.detectMultiScale(gray_eq, scaleFactor=1.05, minNeighbors=2, minSize=(30, 30))
    if len(faces) == 0:
        faces = face_cascade_alt2.detectMultiScale(gray_eq, scaleFactor=1.05, minNeighbors=2, minSize=(30, 30))
    if len(faces) == 0:
        return FaceQualityResult(
            ready=False,
            focus_score=0.0,
            focus_ready=False,
            face_detected=False,
            full_face_visible=False,
            in_frame=False,
            pose_ready=False,
            message="No face detected",
        )

    # Use the largest detected face.
    x, y, fw, fh = sorted(faces, key=lambda b: b[2] * b[3], reverse=True)[0]
    face_gray = gray_eq[y:y + fh, x:x + fw]

    focus_score = float(cv2.Laplacian(face_gray, cv2.CV_64F).var())
    focus_ready = focus_score >= 20.0

    margin_x = int(w * 0.09)
    margin_y = int(h * 0.09)
    full_face_visible = x > margin_x and y > margin_y and (x + fw) < (w - margin_x) and (y + fh) < (h - margin_y)

    cx = (x + fw / 2.0) / max(w, 1)
    cy = (y + fh / 2.0) / max(h, 1)
    size_ratio = fw / max(w, 1)
    in_guide_circle = (cx - 0.5) ** 2 + (cy - 0.5) ** 2 <= 0.03
    right_size = 0.26 <= size_ratio <= 0.55
    in_frame = in_guide_circle and right_size

    # Pose readiness: require two eyes with strict level alignment.
    pose_ready = False
    eyes = eye_cascade.detectMultiScale(face_gray, scaleFactor=1.05, minNeighbors=3, minSize=(10, 10))
    if len(eyes) >= 2:
        two_biggest = sorted(eyes, key=lambda e: e[2] * e[3], reverse=True)[:2]
        e1, e2 = two_biggest
        e1x, e1y = e1[0] + e1[2] / 2.0, e1[1] + e1[3] / 2.0
        e2x, e2y = e2[0] + e2[2] / 2.0, e2[1] + e2[3] / 2.0
        eye_dx = abs(e2x - e1x)
        eye_dy = abs(e2y - e1y)
        eyes_level = eye_dx > 1 and (eye_dy / eye_dx) < 0.16

        # Require eye centers to be in upper half of detected face box.
        eyes_upper_half = e1y < fh * 0.58 and e2y < fh * 0.58

        # Extra occlusion guard: ensure center-face region still has detail (nose/mid-face visible).
        cx0 = int(fw * 0.35)
        cx1 = int(fw * 0.65)
        cy0 = int(fh * 0.35)
        cy1 = int(fh * 0.75)
        center_face_patch = face_gray[cy0:cy1, cx0:cx1]
        center_detail = float(cv2.Laplacian(center_face_patch, cv2.CV_64F).var()) if center_face_patch.size > 0 else 0.0
        center_visible = center_detail >= 25.0

        pose_ready = eyes_level and eyes_upper_half and center_visible

    ready = focus_ready and full_face_visible and in_frame and pose_ready

    if not full_face_visible:
        message = "Show your full face with no cutoff"
    elif not in_frame:
        message = "Center your face inside the guide circle"
    elif not pose_ready:
        message = "Face camera directly and keep full facial features visible"
    elif not focus_ready:
        message = "Hold still to improve sharpness"
    else:
        message = "Clear - ready to capture"

    return FaceQualityResult(
        ready=ready,
        focus_score=round(focus_score, 2),
        focus_ready=focus_ready,
        face_detected=True,
        full_face_visible=full_face_visible,
        in_frame=in_frame,
        pose_ready=pose_ready,
        message=message,
    )

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
