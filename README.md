# MindMetric

MindMetric is an interactive student wellbeing prediction app. It uses the trained `Mental_Health_Model.pkl` model and the student lifestyle data in `Student Social Media And Mental Health Impact.csv` to estimate a mental health score from 0 to 10.

The project includes:

- A FastAPI backend in `main.py`
- A responsive HTML/CSS/JavaScript frontend in `static/`
- A trained scikit-learn model in `Mental_Health_Model.pkl`
- The original analysis notebook in `ML_PROJECT.ipynb`
- The training dataset in `Student Social Media And Mental Health Impact.csv`

> This project is for educational reflection only. It is not a clinical or medical assessment.

## GitHub Publishing

Commit and push these files and folders:

- `main.py`
- `static/`
- `Mental_Health_Model.pkl`
- `Student Social Media And Mental Health Impact.csv`
- `ML_PROJECT.ipynb`
- `README.md`
- `.gitignore`

Do not commit `.venv/`, `__pycache__/`, `.ipynb_checkpoints/`, `.env` files, logs, or editor settings. These are covered by `.gitignore`.

The model file is 18 MB, which is below GitHub's 100 MB per-file limit. If the model becomes larger than 100 MB, use Git LFS instead of a normal Git commit.

### First push to GitHub

Create an empty repository on GitHub, then run these commands from the project directory:

```bash
git init
git add .
git status
git commit -m "Initial MindMetric application"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

Replace `YOUR_USERNAME/YOUR_REPOSITORY` with your GitHub repository path. Review the output of `git status` before committing and make sure `.venv/` is not listed.

## Requirements

- Python 3.10 or newer
- pip
- A modern web browser

The included virtual environment is named `.venv`. You can use it, or create a new one.

## Run the Application

Open a terminal in the project directory:

### 1. Activate the virtual environment

Linux/macOS:

```bash
source .venv/bin/activate
```

Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

Windows Command Prompt:

```bat
.venv\Scripts\activate.bat
```

### 2. Install dependencies

If the environment does not already contain the packages, run:

```bash
python -m pip install fastapi uvicorn pandas joblib scikit-learn
```

### 3. Start the backend and frontend

```bash
uvicorn main:app --host 127.0.0.1 --port 8091
```

Keep this terminal open while using the app.

### 4. Open the app

Visit:

<http://127.0.0.1:8091>

The frontend is served by FastAPI, so do not open `index.html` directly from the file system. The browser needs the API server to load the model options and submit predictions.

## Using the App

1. Complete the student profile form.
2. Select the current stress level and daily routine values.
3. Click **Calculate my signal**.
4. Review the estimated score and outlook.
5. Use **Adjust profile** to make another prediction.

The available dropdown options are loaded from the CSV at runtime. The backend also converts countries outside the ten most frequent training countries to `Other`, matching the model's training pipeline.

## API Endpoints

### Health check

```bash
curl http://127.0.0.1:8091/api/health
```

Example response:

```json
{"status":"ok","model":"Mental_Health_Model.pkl"}
```

### Get form options

```bash
curl http://127.0.0.1:8091/api/options
```

### Make a prediction

```bash
curl -X POST http://127.0.0.1:8091/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "age": 21,
    "gender": "Female",
    "country": "India",
    "academic_level": "Undergraduate",
    "platform": "Instagram",
    "purpose": "Entertainment",
    "daily_usage_hours": 4.5,
    "daily_unlocks": 120,
    "study_hours": 4,
    "physical_activity_hours": 1.5,
    "sleep_hours": 7,
    "stress_level": "Medium"
  }'
```

Example response:

```json
{"score":6.0,"outlook":"Balanced"}
```

Interactive API documentation is also available at:

<http://127.0.0.1:8091/docs>

## Run the Notebook

The notebook contains the exploratory data analysis and model development work. With the virtual environment activated, install Jupyter if needed:

```bash
python -m pip install jupyter
```

Launch it with:

```bash
jupyter notebook ML_PROJECT.ipynb
```

The notebook expects these files to remain in the same project directory:

- `Student Social Media And Mental Health Impact.csv`
- `Mental_Health_Model.pkl`

## Project Structure

```text
MindMetric/
├── .gitignore
├── main.py
├── ML_PROJECT.ipynb
├── Mental_Health_Model.pkl
├── Student Social Media And Mental Health Impact.csv
├── README.md
└── static/
    ├── index.html
    ├── styles.css
    └── app.js
```

## Troubleshooting

### Port 8091 is already in use

Use another port:

```bash
uvicorn main:app --host 127.0.0.1 --port 8092
```

Then open <http://127.0.0.1:8092>.

On Linux, find the process using port 8091 with:

```bash
lsof -i :8091
```

### `ModuleNotFoundError`

Activate the virtual environment and install the dependencies again:

```bash
source .venv/bin/activate
python -m pip install fastapi uvicorn pandas joblib scikit-learn
```

### The page loads but dropdowns are empty

Confirm that the API is running and check:

```bash
curl http://127.0.0.1:8091/api/options
```

### Model loading errors

The pickle file was created with scikit-learn. Use the same or a compatible scikit-learn version when loading `Mental_Health_Model.pkl`. Do not rename or move the model and CSV files unless you also update the paths in `main.py`.

## Development Check

Compile the backend to check for Python syntax errors:

```bash
python -m py_compile main.py
```

Check the health endpoint while the server is running:

```bash
curl http://127.0.0.1:8091/api/health
```
