+--------------------------+      +---------------------------------+
|   User (Student/Alumni)  |----->|   React Frontend (Main App)     |
+--------------------------+      +---------------------------------+
| ▲
+--------------------------+      | |           (Firebase SDK)
|        Administrator     |----->| |
+--------------------------+      | V
+---------------------------------+
|   Firebase Backend              |
|   (Auth, Firestore, Storage)    |
+---------------------------------+
|
+-----------------------+-----------------------+
|                                               |
V                                               V
+--------------------------+      +---------------------------------+
|   Flask AI Match API     |      |   Flask Job Recommendation API  |
+--------------------------+      +---------------------------------+

.env.local
REACT_APP_FIREBASE_API_KEY="your-api-key"
REACT_APP_FIREBASE_AUTH_DOMAIN="your-auth-domain"
REACT_APP_FIREBASE_PROJECT_ID="your-project-id"
REACT_APP_FIREBASE_STORAGE_BUCKET="your-storage-bucket"
REACT_APP_FIREBASE_MESSAGING_SENDER_ID="your-messaging-sender-id"
REACT_APP_FIREBASE_APP_ID="your-app-id"
REACT_APP_FIREBASE_MEASUREMENT_ID="your-measurement-id"

REACT_APP_GOOGLE_AI_API_KEY="your-google-gemini-api-key"

Add these URLs when you deploy your Flask APIs
REACT_APP_MATCH_SCORE_API_URL=""
REACT_APP_JOB_RECOMMENDATION_API_URL=""

Your main app will be running on http://localhost:3000.

Terminal 2: Admin Portal App

Your admin portal will likely run on http://localhost:3001.

Terminal 3: AI Alumni Match API

Your match API will be running on http://127.0.0.1:5000.

Terminal 4: AI Job Recommendation API

Your job recommendation API will be running on http://127.0.0.1:5001.

🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

📜 License
This project is licensed under the MIT License.

📧 Contact
Megha P V - 

Project Link: 
