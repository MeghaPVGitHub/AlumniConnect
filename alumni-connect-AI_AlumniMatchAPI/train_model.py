# Step 1: Import the necessary libraries
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import joblib

# Step 2: Load your dataset
data = pd.read_csv('training_data.csv')

# Step 3: Feature Engineering
def count_common_skills(row):
    viewer_skills = set(str(row['viewer_skills']).lower().split('|'))
    target_skills = set(str(row['target_skills']).lower().split('|'))
    return len(viewer_skills.intersection(target_skills))
data['common_skills_count'] = data.apply(count_common_skills, axis=1)
data['branch_match'] = (data['viewer_branch'].str.lower() == data['target_branch'].str.lower()).astype(int)
company_dummies = pd.get_dummies(data['target_company'], prefix='company')
data = pd.concat([data, company_dummies], axis=1)

# Step 4: Define features (X) and target (y)
feature_columns = ['common_skills_count', 'branch_match'] + list(company_dummies.columns)
X = data[feature_columns]
y = data['is_match']

# Step 5: Split the data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Step 6: Create and Train the Model
print("Training the model...")
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)
print("Model training complete!")

# Step 7: Evaluate the Model's Performance
predictions = model.predict(X_test)
accuracy = accuracy_score(y_test, predictions)
print(f"Model Accuracy on Test Data: {accuracy * 100:.2f}%")

# Step 8: Save the trained model and columns to files
joblib.dump(model, 'alumni_match_model.joblib')
joblib.dump(feature_columns, 'model_feature_columns.joblib')
print("\nModel saved! You can now download the two .joblib files.")