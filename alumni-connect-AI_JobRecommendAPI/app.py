from flask import Flask, request, jsonify
import joblib
import pandas as pd

app = Flask(__name__)

# Load the trained model and the feature list
model = joblib.load('job_recommendation_model.joblib')
model_features = joblib.load('model_features.joblib')

# --- Feature Engineering Logic ---
skill_weights = {
    'java': 3, 'python': 3, 'react': 3, 'c++': 3, 'sql': 3, 'aws': 3, 'ai': 3, 'ml': 3,
    'tensorflow': 3, 'nodejs': 3, 'swift': 3, 'ios': 3, 'cybersecurity': 3,
    'devops': 3, 'docker': 3, 'go': 3, 'microservices': 3, 'qa': 3, 'selenium': 3,
    'data science': 3, 'vhdl': 3, 'verilog': 3, 'embedded c': 3, 'rtos': 3,
    'vlsi': 3, 'cad': 3, 'solidworks': 3, 'robotics': 3, 'staadpro': 3,
    'html': 2, 'css': 2, 'javascript': 2, 'ui/ux': 2, 'figma': 2, 'autocad': 2,
    'thermodynamics': 2, 'manufacturing': 2, 'signal processing': 2, 'analog design': 2,
}

def calculate_final_score(user_skills, job_skills):
    user_skill_set = set(str(user_skills).lower().split('|'))
    job_skill_set = set(str(job_skills).lower().split('|'))
    common_skills = user_skill_set.intersection(job_skill_set)
    
    score = 0
    for skill in common_skills:
        score += skill_weights.get(skill, 1)
    return score

@app.route('/recommend', methods=['POST'])
def recommend():
    try:
        data = request.get_json()
        user_profile = data.get('user_profile')
        jobs = data.get('jobs')

        if not user_profile or not jobs:
            return jsonify({"error": "Missing user_profile or jobs data"}), 400

        recommendations = []
        for job in jobs:
            score = calculate_final_score(user_profile.get('skills', ''), job.get('skills', ''))
            input_data = pd.DataFrame([[score]], columns=model_features)
            is_match = model.predict(input_data)[0]

            if is_match == 1:
                recommendations.append({'job_id': job.get('id'), 'score': score})

        sorted_recommendations = sorted(recommendations, key=lambda x: x['score'], reverse=True)
        top_3_job_ids = [rec['job_id'] for rec in sorted_recommendations[:3]]
        
        return jsonify(top_3_job_ids)
    
    except Exception as e:
        return jsonify({"error": "An internal server error occurred.", "details": str(e)}), 500