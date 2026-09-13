const form = document.querySelector('#profile-form');
const emptyState = document.querySelector('#empty-state');
const resultState = document.querySelector('#result-state');
const submitButton = form.querySelector('.submit-button');

async function loadOptions() {
  const response = await fetch('/api/options');
  const options = await response.json();
  document.querySelectorAll('[data-options]').forEach((select) => {
    options[select.dataset.options].forEach((value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
  });
  document.querySelector('[name="gender"]').value = 'Female';
  document.querySelector('[name="country"]').value = 'India';
  document.querySelector('[name="academic_level"]').value = 'Undergraduate';
  document.querySelector('[name="platform"]').value = 'Instagram';
  document.querySelector('[name="purpose"]').value = 'Entertainment';
  document.querySelector('[name="stress_level"]').value = 'Medium';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  submitButton.disabled = true;
  submitButton.querySelector('span').textContent = 'Reading your signal...';
  const payload = Object.fromEntries(new FormData(form));
  ['age', 'daily_usage_hours', 'daily_unlocks', 'study_hours', 'physical_activity_hours', 'sleep_hours'].forEach((key) => { payload[key] = Number(payload[key]); });
  try {
    const response = await fetch('/api/predict', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error('Prediction unavailable');
    const data = await response.json();
    document.querySelector('#score').textContent = data.score.toFixed(2);
    document.querySelector('#outlook').textContent = data.outlook;
    const degrees = Math.round((data.score / 10) * 360);
    document.querySelector('.score-ring').style.background = `conic-gradient(var(--orange) ${degrees}deg, #dde1d6 ${degrees}deg)`;
    emptyState.classList.add('hidden');
    resultState.classList.remove('hidden');
  } catch (error) {
    alert('We could not calculate the score. Please check the values and try again.');
  } finally {
    submitButton.disabled = false;
    submitButton.querySelector('span').textContent = 'Calculate my signal';
  }
});

document.querySelector('#reset-button').addEventListener('click', () => {
  resultState.classList.add('hidden');
  emptyState.classList.remove('hidden');
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

loadOptions().catch(() => alert('Could not load the model options. Is the API running?'));
