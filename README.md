# Alumni Connect Platform

**Alumni Connect** is a full-stack, cross-platform ecosystem designed to bridge the gap between students, alumni, and university administrators. It facilitates networking, job placement, event management, and mentorship through a seamless web and mobile experience, powered by AI.

---

## 🚀 Project Overview

This repository contains the source code for three distinct applications that share a centralized Firebase backend:

1.  **🎓 Student/Alumni Web Portal:** The core networking hub for users to connect, find jobs, and attend events.
2.  **🛡️ Admin Portal:** A management dashboard for university staff to verify alumni, moderate content, and view analytics.
3.  **📱 Mobile App (React Native):** A companion app for on-the-go access to the directory, chat, and feeds.

---

## ✨ Key Features

### 🌐 Web Platform (React)
* **AI-Powered Job Matching:** Matches user skills and branch with job postings using a custom scoring algorithm.
* **Smart Resume Parser:** Uses Google Gemini AI to extract details (Skills, Education, Experience) from uploaded resumes (PDF/Image) to auto-fill profiles.
* **Real-Time Messenger:** Integrated chat system using Firestore listeners.
* **Event Management:** Register for reunions and webinars with live attendee tracking.
* **Social Feed:** LinkedIn-style feed for sharing updates, photos, and achievements.

### 🛡️ Admin Portal
* **Dashboard Analytics:** Visual charts for user distribution (Alumni vs. Students) and engagement metrics.
* **Batch Operations:** "Batch Graduate" students to alumni status and CSV bulk import for user onboarding.
* **Content Moderation:** Approval workflows for job postings and verification queues for alumni badges.

### 📱 Mobile App (Expo/React Native)
* **Cross-Platform:** Runs on iOS and Android.
* **Theme Support:** Robust Light/Dark mode toggling.
* **Directory & Chat:** Full access to the alumni directory and real-time messaging.

---

## 🛠️ Tech Stack

* **Frontend Web:** React.js, Tailwind CSS, Recharts, Lucide React.
* **Mobile:** React Native, Expo, React Native StyleSheet.
* **Backend:** Firebase (Firestore, Authentication, Storage).
* **Artificial Intelligence:** Google Gemini API (`gemini-1.5-flash` / `gemini-2.5-flash`), Custom API for Job recommendation & Alumni Matching Algorithm 

---

## ⚙️ Prerequisites

Before running the project, ensure you have the following:

* **Node.js** (v16 or higher)
* **Firebase Account:** A project with Authentication (Email/Password), Firestore Database, and Storage enabled.
* **Google AI Studio Key:** An API key for Gemini.

---

## 🚀 Installation & Setup

### 1. Firebase Configuration
1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Create a new project.
3.  Enable **Authentication** (Email/Password provider).
4.  Enable **Firestore Database** (Start in Test mode for development).
5.  Enable **Storage**.
6.  Copy your web configuration object.

### 2. Setting up the Web Application
```bash
# Clone the repository
git clone [https://github.com/yourusername/alumni-connect.git](https://github.com/yourusername/alumni-connect.git)
cd alumni-connect/web

# Install dependencies
npm install

# Create environment variables
touch .env.local
