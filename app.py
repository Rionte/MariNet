import os
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from datetime import datetime
import uuid
import requests
import json
import pytz

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///marinet.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = os.path.join('static', 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload
app.config['GEMINI_API_KEY'] = 'AIzaSyA6G79HI5EwMl1xPBaqoZldk1qQIzfr-68'

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

# IGNORE THIS SHIT NIGGA
AI_RESPONSES = {
    "default": [
        "That's an interesting question. Let me help you understand this better.",
        "I'd be happy to explain this topic. Here's what you need to know:",
        "Great question! Let me break this down for you:",
        "I can definitely help with that. Here's an explanation:",
        "Let me share some information about this topic that might help you understand better."
    ],
    "math": [
        "When solving math problems, it's helpful to break them down into smaller steps.",
        "In mathematics, we often look for patterns and relationships between numbers.",
        "This mathematical concept can be understood by thinking about it visually.",
        "Let's approach this step-by-step to find the solution.",
        "Mathematical problems often have multiple solution methods. Let me show you one approach."
    ],
    "science": [
        "This scientific concept is based on observations and experiments that show...",
        "In science, we try to explain phenomena through testable hypotheses.",
        "Scientists have found that this process works by...",
        "The scientific evidence suggests that...",
        "This can be explained using the scientific principle of..."
    ],
    "english": [
        "In literature, authors often use various techniques to convey meaning.",
        "This literary device is commonly used to emphasize...",
        "When analyzing this text, consider the author's intended audience and purpose.",
        "The language used here creates a specific tone that...",
        "Let's look at how the structure of this text contributes to its meaning."
    ],
    "history": [
        "Historical events should be understood within their broader context.",
        "Historians analyze primary and secondary sources to understand...",
        "This historical development was influenced by several factors including...",
        "From a historical perspective, this event was significant because...",
        "The historical evidence suggests that this occurred due to..."
    ]
}
def get_est_time():
    # Get current UTC time
    utc_now = datetime.utcnow()
    # Create Eastern timezone object
    eastern = pytz.timezone('US/Eastern')
    # Convert UTC time to Eastern time
    est_now = utc_now.replace(tzinfo=pytz.utc).astimezone(eastern)
    # Return the converted time
    return est_now
# Association table for group memberships
group_members = db.Table('group_members',
    db.Column('user_id', db.String(36), db.ForeignKey('user.id'), primary_key=True),
    db.Column('group_id', db.String(36), db.ForeignKey('group.id'), primary_key=True),
    db.Column('is_admin', db.Boolean, default=False),
    db.Column('joined_at', db.DateTime, default=get_est_time)
)

# Models
class User(db.Model, UserMixin):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    avatar_url = db.Column(db.String(500), nullable=True, default='/static/default_avatar.jpg')
    bio = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=get_est_time)
    
    posts = db.relationship('Post', backref='user', lazy=True)
    group_posts = db.relationship('GroupPost', backref='user', lazy=True)
    groups = db.relationship('Group', secondary=group_members, backref=db.backref('members', lazy='dynamic'))
    
    def __repr__(self):
        return f'<User {self.username}>'

class Post(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    content = db.Column(db.Text, nullable=False)
    image_url = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=get_est_time)
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    upvotes = db.Column(db.Integer, default=0)
    downvotes = db.Column(db.Integer, default=0)
    
class Group(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    icon = db.Column(db.String(50), nullable=False, default='people')
    created_at = db.Column(db.DateTime, default=get_est_time)
    created_by = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    
    posts = db.relationship('GroupPost', backref='group', lazy=True)
    
    @property
    def members_count(self):
        return self.members.count()
        
    def is_member(self, user):
        return self.members.filter_by(id=user.id).first() is not None
        
    def is_admin(self, user):
        membership = db.session.query(group_members).filter_by(
            user_id=user.id, 
            group_id=self.id
        ).first()
        return membership and membership.is_admin if membership else False
    
class GroupPost(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    content = db.Column(db.Text, nullable=False)
    image_url = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=get_est_time)
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    group_id = db.Column(db.String(36), db.ForeignKey('group.id'), nullable=False)
    upvotes = db.Column(db.Integer, default=0)
    downvotes = db.Column(db.Integer, default=0)
    
class Vote(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    post_id = db.Column(db.String(36), db.ForeignKey('post.id'), nullable=True)
    group_post_id = db.Column(db.String(36), db.ForeignKey('group_post.id'), nullable=True)
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    vote_type = db.Column(db.String(10), nullable=False)  # 'upvote' or 'downvote'
    created_at = db.Column(db.DateTime, default=get_est_time)
    
    post = db.relationship('Post', backref=db.backref('votes', lazy=True), foreign_keys=[post_id])
    group_post = db.relationship('GroupPost', backref=db.backref('votes', lazy=True), foreign_keys=[group_post_id])
    user = db.relationship('User', backref=db.backref('votes', lazy=True))

class AiConversation(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=get_est_time)
    
    messages = db.relationship('AiMessage', backref='conversation', lazy=True, order_by="AiMessage.created_at")
    user = db.relationship('User', backref=db.backref('ai_conversations', lazy=True))

class AiMessage(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = db.Column(db.String(36), db.ForeignKey('ai_conversation.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    is_user = db.Column(db.Boolean, default=True)  # True for user message, False for AI response
    created_at = db.Column(db.DateTime, default=get_est_time)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(user_id)

# Function to generate AI tutor responses using Gemini API
def generate_ai_response(user_message, conversation_history=None):
    # Use Gemini API to generate a response
    api_key = app.config['GEMINI_API_KEY']
    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
    
    # Prepare the request payload
    parts = [{"text": user_message}]
    
    # Create a simpler payload format for the flash model
    payload = {
        "contents": [
            {
                "parts": parts
            }
        ]
    }
    
    try:
        # Send request to Gemini API
        response = requests.post(
            api_url,
            headers={"Content-Type": "application/json"},
            data=json.dumps(payload)
        )
        
        # Check if request was successful
        if response.status_code == 200:
            response_data = response.json()
            print("Gemini API response:", response_data)  # Debug log
            
            # Extract the response text from the Gemini API response
            ai_response = response_data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            
            # If no response was generated, use a fallback
            if not ai_response:
                return "I'm sorry, I couldn't generate a response at the moment. Could you try rephrasing your question?"
            
            return ai_response
        else:
            # Log the error for debugging
            print(f"Gemini API error: {response.status_code} - {response.text}")
            return "I'm having trouble connecting to my knowledge base right now. Please try again in a moment."
    
    except Exception as e:
        # Log the exception for debugging
        print(f"Error using Gemini API: {str(e)}")
        return "Sorry, I encountered an error while processing your request. Please try again later."

# Import routes after models to avoid circular imports
from routes import *

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        # Create admin user if it doesn't exist
        admin = User.query.filter_by(email='admin@marinet.edu').first()
        if not admin:
            admin = User(
                username='admin',
                email='admin@marinet.edu',
                password=generate_password_hash('admin123'),
                avatar_url='/static/default_avatar.png'
            )
            db.session.add(admin)
            db.session.commit()  # Commit to get the admin ID
            
            # Create sample groups
            groups = [
                {
                    'name': 'Math Club',
                    'description': 'A group for math enthusiasts to share problems and solutions.',
                    'icon': 'calculator'
                },
                {
                    'name': 'Science Club',
                    'description': 'Discuss scientific discoveries and experiments.',
                    'icon': 'flask'
                },
                {
                    'name': 'Literature Society',
                    'description': 'For those who love reading and discussing books.',
                    'icon': 'book'
                }
            ]
            
            # Get the admin user ID
            admin = User.query.filter_by(email='admin@marinet.edu').first()
            
            for group_data in groups:
                group = Group(
                    name=group_data['name'],
                    description=group_data['description'],
                    icon=group_data['icon'],
                    created_by=admin.id
                )
                db.session.add(group)
            
            db.session.commit()
            
            # Add admin as member of all groups
            for group in Group.query.all():
                stmt = group_members.insert().values(
                    user_id=admin.id,
                    group_id=group.id,
                    is_admin=True
                )
                db.session.execute(stmt)
            
            db.session.commit()
    
    app.run(debug=True)

# Add Jinja2 filters
@app.template_filter('nl2br')
def nl2br(text):
    """Convert newlines to <br> tags"""
    if not text:
        return ""
    return text.replace('\n', '<br>') 