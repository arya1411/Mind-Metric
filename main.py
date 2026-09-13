import joblib
import pandas as pd
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "Student Social Media And Mental Health Impact.csv"
MODEL_PATH = BASE_DIR / "Mental_Health_Model.pkl"
model = joblib.load(MODEL_PATH)
dataset = pd.read_csv(DATA_PATH)
top_countries = dataset["Country"].value_counts().head(10).index.tolist()

app = FastAPI(title="MindMetric API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")


class StudentProfile(BaseModel):
	age: int = Field(..., ge=13, le=100)
	gender: str
	country: str
	academic_level: str
	platform: str
	purpose: str
	daily_usage_hours: float = Field(..., ge=0, le=24)
	daily_unlocks: int = Field(..., ge=0, le=1000)
	study_hours: float = Field(..., ge=0, le=24)
	physical_activity_hours: float = Field(..., ge=0, le=24)
	sleep_hours: float = Field(..., ge=0, le=24)
	stress_level: str


def options_for(column: str) -> list[str]:
	return sorted(dataset[column].dropna().unique().tolist())


@app.get("/")
def home() -> FileResponse:
	return FileResponse(BASE_DIR / "static" / "index.html")


@app.get("/api/health")
def health() -> dict[str, str]:
	return {"status": "ok", "model": MODEL_PATH.name}


@app.get("/api/options")
def get_options() -> dict[str, list[str]]:
	return {"genders": options_for("Gender"), "countries": options_for("Country"), "academic_levels": options_for("Academic_Level"), "platforms": options_for("Most_Used_Platform"), "purposes": options_for("Purpose_Of_Use"), "stress_levels": ["Low", "Medium", "High", "Very High"]}


@app.post("/api/predict")
def predict(profile: StudentProfile) -> dict[str, float | str]:
	values = pd.DataFrame([{
		"Study_Hours": profile.study_hours,
		"Age": profile.age,
		"Avg_Daily_Usage_Hours": profile.daily_usage_hours,
		"Daily_Unlocks": profile.daily_unlocks,
		"Physical_Activity_Hours": profile.physical_activity_hours,
		"Sleep_Hours_Per_Night": profile.sleep_hours,
		"Stress_Level": profile.stress_level,
		"Gender": profile.gender,
		"Academic_Level": profile.academic_level,
		"Most_Used_Platform": profile.platform,
		"Purpose_Of_Use": profile.purpose,
		"Grouped_country": profile.country if profile.country in top_countries else "Other",
	}])
	try:
		score = float(model.predict(values)[0])
	except Exception as exc:
		raise HTTPException(status_code=422, detail=f"Prediction failed: {exc}") from exc
	score = max(0.0, min(10.0, score))
	outlook = "Strong" if score >= 7 else "Balanced" if score >= 5 else "Needs attention"
	return {"score": round(score, 2), "outlook": outlook}

