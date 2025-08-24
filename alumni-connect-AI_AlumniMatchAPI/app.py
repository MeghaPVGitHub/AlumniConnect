from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import os

app = Flask(__name__)
CORS(app)

# In Spaces, files are in the same directory
model = joblib.load('alumni_match_model.joblib')
model_columns = joblib.load('model_feature_columns.joblib')

@app.route('/', methods=['POST'])
def handler():
    incoming_data = request.get_json()
    df = pd.DataFrame([incoming_data])

    def count_common_skills(row):
        viewer_skills = set(str(row.get('viewer_skills', '')).lower().split('|'))
        target_skills = set(str(row.get('target_skills', '')).lower().split('|'))
        return len(viewer_skills.intersection(target_skills))

    df['common_skills_count'] = df.apply(count_common_skills, axis=1)
    df['branch_match'] = (df['viewer_branch'].str.lower() == df['target_branch'].str.lower()).astype(int)

    for col in model_columns:
        if col.startswith('company_'):
            df[col] = 0
    
    company_name = incoming_data.get('target_company', '')
    if company_name:
        company_col_name = f"company_{company_name}"
        if company_col_name in df.columns:
            df[company_col_name] = 1

    final_df = df[model_columns]
    prediction_proba = model.predict_proba(final_df)
    match_probability = prediction_proba[0][1]
    final_score = round(match_probability * 10)

    return jsonify({'score': final_score})

# ADD THESE FINAL TWO LINES TO START THE SERVER
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=7860)