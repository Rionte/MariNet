# MariNet

MariNet is a social learning platform built with Flask, allowing users to connect, post content, join academic clubs, and engage with a built-in AI Tutor powered by Gemini AI.

## 🌐 Features

- ✅ **User Authentication** (Register/Login/Logout)
- 📝 **Post System** with image support and voting (upvote/downvote)
- 🧠 **AI Tutor** powered by Gemini (math, science, history, etc.)
- 👥 **Group System** with posts, membership, and admin roles
- 🔔 **Notifications** (mentions, group interactions)
- 🗳️ **Voting system** for both user and group posts
- 🧪 **Responsive UI** using Bootstrap 5 + custom CSS
- 📁 **Image Uploads** with secure file handling
- 💬 **Anonymous Chat Room** with unique identities

## 🛠️ Tech Stack

- **Backend:** Python, Flask, Flask-SQLAlchemy, Flask-Login
- **Frontend:** Bootstrap 5, Jinja2 templates, JavaScript
- **AI:** Gemini API (Google Generative Language API)
- **Database:** SQLite
- **Other:** Socket.IO for real-time chat

## 🔧 How to Run

### 1. Clone the Repository

bash
- git clone https://github.com/yourusername/marinet.git
- cd marinet

### 2. Install all dependencies

pip install -r requirements.txt

### 3. Keys

- Set up Gemini API key:  Your Google Generative Language API key
- Secret Key: A strong random string

### 4. Run the App

- flask run

### Default Admin account

- Email: admin@marinet.edu
- Password: admin123
