import os
from flask import render_template, request, redirect, url_for, flash, jsonify, session
from flask_login import login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from datetime import datetime
import uuid
from app import app, db, User, Post, Vote, Group, GroupPost, AiConversation, AiMessage, generate_ai_response, group_members


# Helper functions
def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in {'png', 'jpg', 'jpeg', 'gif'}

def save_image(file):
    if not file:
        return None
    
    if file and allowed_file(file.filename):
        filename = secure_filename(f"{uuid.uuid4()}_{file.filename}")
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        # Return the path relative to static folder
        return '/static/uploads/' + filename
    return None

# Auth routes
@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
        
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        
        user = User.query.filter_by(email=email).first()
        
        if not user or not check_password_hash(user.password, password):
            flash('Invalid email or password', 'error')
            return render_template('login.html', error='Invalid email or password')
        
        login_user(user)
        flash('Login successful', 'success')
        return redirect(url_for('index'))
        
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
        
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        
        # Check if user exists
        user_by_email = User.query.filter_by(email=email).first()
        user_by_username = User.query.filter_by(username=username).first()
        
        if user_by_email:
            flash('Email already in use', 'error')
            return render_template('register.html', error='Email already in use')
            
        if user_by_username:
            flash('Username already taken', 'error')
            return render_template('register.html', error='Username already taken')
        
        # Create new user
        new_user = User(
            username=username,
            email=email,
            password=generate_password_hash(password),
            avatar_url='/static/default_avatar.jpg'
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        login_user(new_user)
        flash('Registration successful', 'success')
        return redirect(url_for('index'))
        
    return render_template('register.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('You have been logged out', 'info')
    return redirect(url_for('login'))

# Add delete post route
@app.route('/delete_post/<post_id>', methods=['POST'])
@login_required
def delete_post(post_id):
    post = Post.query.get_or_404(post_id)
    
    # Check if user is the owner of the post
    if post.user_id != current_user.id:
        flash('You can only delete your own posts', 'error')
        return redirect(url_for('feed'))
    
    # Delete votes associated with the post
    Vote.query.filter_by(post_id=post_id).delete()
    
    # Delete the post
    db.session.delete(post)
    db.session.commit()
    
    flash('Post deleted successfully', 'success')
    return redirect(url_for('feed'))

# Main routes
@app.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('feed'))
    return render_template('index.html')

@app.route('/feed')
def feed():
    posts = Post.query.order_by(Post.created_at.desc()).all()
    return render_template('feed.html', posts=posts)

@app.route('/terms')
def terms():
    return render_template('terms.html')

@app.route('/privacy')
def privacy():
    return render_template('privacy.html')

@app.route('/contact')
def contact():
    return render_template('contact.html')

@app.route('/create_post', methods=['POST'])
@login_required
def create_post():
    content = request.form.get('content')
    
    if not content and 'image' not in request.files:
        flash('Post cannot be empty', 'error')
        return redirect(url_for('feed'))
    
    if content and len(content) > 900:
        flash('Post cannot exceed 900 characters', 'error')
        return redirect(url_for('feed'))
    
    image_url = None
    if 'image' in request.files:
        image_file = request.files['image']
        if image_file and image_file.filename != '':
            image_url = save_image(image_file)
    
    new_post = Post(
        content=content or '',  # Allow empty content if image is present
        image_url=image_url,
        user_id=current_user.id
    )
    
    db.session.add(new_post)
    db.session.commit()
    
    flash('Post created successfully', 'success')
    return redirect(url_for('feed'))

@app.route('/vote/<post_id>/<vote_type>', methods=['POST'])
@login_required
def vote(post_id, vote_type):
    if vote_type not in ['upvote', 'downvote']:
        return jsonify({'error': 'Invalid vote type'}), 400
    
    post = Post.query.get_or_404(post_id)
    
    # Check if user already voted
    existing_vote = Vote.query.filter_by(
        post_id=post_id,
        user_id=current_user.id
    ).first()
    
    if existing_vote:
        if existing_vote.vote_type == vote_type:
            # Remove vote if same type
            db.session.delete(existing_vote)
            if vote_type == 'upvote':
                post.upvotes = max(0, post.upvotes - 1)
            else:
                post.downvotes = max(0, post.downvotes - 1)
        else:
            # Change vote type
            existing_vote.vote_type = vote_type
            if vote_type == 'upvote':
                post.upvotes += 1
                post.downvotes = max(0, post.downvotes - 1)
            else:
                post.downvotes += 1
                post.upvotes = max(0, post.upvotes - 1)
    else:
        # Create new vote
        new_vote = Vote(
            post_id=post_id,
            user_id=current_user.id,
            vote_type=vote_type
        )
        db.session.add(new_vote)
        
        if vote_type == 'upvote':
            post.upvotes += 1
        else:
            post.downvotes += 1
    
    db.session.commit()
    
    return jsonify({
        'upvotes': post.upvotes,
        'downvotes': post.downvotes
    })

@app.route('/group_vote/<post_id>/<vote_type>', methods=['POST'])
@login_required
def group_vote(post_id, vote_type):
    if vote_type not in ['upvote', 'downvote']:
        return jsonify({'error': 'Invalid vote type'}), 400
    
    post = GroupPost.query.get_or_404(post_id)
    
    # Check if user is a member of the group
    group = Group.query.get(post.group_id)
    if not group.is_member(current_user):
        return jsonify({'error': 'You must be a member of the group to vote'}), 403
    
    # Check if user already voted
    existing_vote = Vote.query.filter_by(
        group_post_id=post_id,
        user_id=current_user.id
    ).first()
    
    if existing_vote:
        if existing_vote.vote_type == vote_type:
            # Remove vote if same type
            db.session.delete(existing_vote)
            if vote_type == 'upvote':
                post.upvotes = max(0, post.upvotes - 1)
            else:
                post.downvotes = max(0, post.downvotes - 1)
        else:
            # Change vote type
            existing_vote.vote_type = vote_type
            if vote_type == 'upvote':
                post.upvotes += 1
                post.downvotes = max(0, post.downvotes - 1)
            else:
                post.downvotes += 1
                post.upvotes = max(0, post.upvotes - 1)
    else:
        # Create new vote
        new_vote = Vote(
            group_post_id=post_id,
            user_id=current_user.id,
            vote_type=vote_type
        )
        db.session.add(new_vote)
        
        if vote_type == 'upvote':
            post.upvotes += 1
        else:
            post.downvotes += 1
    
    db.session.commit()
    
    return jsonify({
        'upvotes': post.upvotes,
        'downvotes': post.downvotes
    })

@app.route('/profile/<user_id>')
def profile(user_id):
    user = User.query.get_or_404(user_id)
    posts = Post.query.filter_by(user_id=user_id).order_by(Post.created_at.desc()).all()
    return render_template('profile.html', user=user, posts=posts)

@app.route('/settings', methods=['GET', 'POST'])
@login_required
def settings():
    if request.method == 'POST':
        username = request.form.get('username')
        bio = request.form.get('bio')
        
        # Check if username is taken by another user
        user_by_username = User.query.filter_by(username=username).first()
        if user_by_username and user_by_username.id != current_user.id:
            flash('Username already taken', 'error')
            return render_template('settings.html', error='Username already taken')
        
        current_user.username = username
        current_user.bio = bio
        
        if 'avatar' in request.files:
            avatar_file = request.files['avatar']
            if avatar_file and avatar_file.filename != '':
                avatar_url = save_image(avatar_file)
                if avatar_url:
                    current_user.avatar_url = avatar_url
        
        db.session.commit()
        flash('Profile updated successfully', 'success')
        return redirect(url_for('settings'))
        
    return render_template('settings.html')

@app.route('/groups')
def groups():
    all_groups = Group.query.all()
    user_groups = []
    other_groups = []
    
    if current_user.is_authenticated:
        for group in all_groups:
            if group.is_member(current_user):
                user_groups.append({
                    'id': group.id,
                    'name': group.name,
                    'icon': group.icon,
                    'members_count': group.members_count,
                    'description': group.description,
                    'is_admin': group.is_admin(current_user)
                })
            else:
                other_groups.append({
                    'id': group.id,
                    'name': group.name,
                    'icon': group.icon,
                    'members_count': group.members_count,
                    'description': group.description,
                    'is_admin': False
                })
    else:
        other_groups = [{
            'id': group.id,
            'name': group.name,
            'icon': group.icon,
            'members_count': group.members_count,
            'description': group.description,
            'is_admin': False
        } for group in all_groups]
    
    return render_template('groups.html', user_groups=user_groups, other_groups=other_groups)

@app.route('/create_group', methods=['POST'])
@login_required
def create_group():
    # Check if the request has JSON data or form data
    if request.is_json:
        data = request.get_json()
        name = data.get('name')
        description = data.get('description')
        icon = data.get('icon')
    else:
        name = request.form.get('name')
        description = request.form.get('description')
        icon = request.form.get('icon')
    
    if not name:
        return jsonify({'error': 'Group name is required'}), 400
    
    if Group.query.filter_by(name=name).first():
        return jsonify({'error': 'Group name already exists'}), 400
    
    # Create new group
    new_group = Group(
        name=name,
        description=description,
        icon=icon or 'people',
        created_by=current_user.id
    )
    
    db.session.add(new_group)
    db.session.commit()
    
    # Add creator as admin member
    stmt = group_members.insert().values(
        user_id=current_user.id,
        group_id=new_group.id,
        is_admin=True
    )
    db.session.execute(stmt)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'group_id': new_group.id
    })

@app.route('/groups/<group_id>')
def group_detail(group_id):
    group = Group.query.get_or_404(group_id)
    
    # Get all members of the group with admin status
    members_data = db.session.query(User, group_members.c.is_admin) \
        .join(group_members, User.id == group_members.c.user_id) \
        .filter(group_members.c.group_id == group_id) \
        .all()
    
    members = [
        {
            'id': user.id,
            'username': user.username,
            'avatar_url': user.avatar_url,
            'is_admin': is_admin
        }
        for user, is_admin in members_data
    ]
    
    # Get admin users
    admins = [member for member in members if member['is_admin']]
    
    # Get group posts
    posts = GroupPost.query.filter_by(group_id=group_id).order_by(GroupPost.created_at.desc()).all()
    
    is_member = current_user.is_authenticated and group.is_member(current_user)
    is_admin = current_user.is_authenticated and group.is_admin(current_user)
    
    return render_template(
        'group_detail.html', 
        group=group, 
        posts=posts, 
        members=members,
        admins=admins,
        is_member=is_member,
        is_admin=is_admin
    )

@app.route('/join_group/<group_id>', methods=['POST'])
@login_required
def join_group(group_id):
    group = Group.query.get_or_404(group_id)
    
    if group.is_member(current_user):
        flash('You are already a member of this group', 'info')
        return redirect(url_for('group_detail', group_id=group_id))
    
    # Add user to group
    stmt = group_members.insert().values(
        user_id=current_user.id,
        group_id=group_id,
        is_admin=False
    )
    db.session.execute(stmt)
    db.session.commit()
    
    flash(f'You have joined {group.name}', 'success')
    return redirect(url_for('group_detail', group_id=group_id))

@app.route('/leave_group/<group_id>', methods=['POST'])
@login_required
def leave_group(group_id):
    group = Group.query.get_or_404(group_id)
    
    if not group.is_member(current_user):
        flash('You are not a member of this group', 'error')
        return redirect(url_for('group_detail', group_id=group_id))
    
    # Check if user is the only admin
    admin_count = db.session.query(group_members) \
        .filter(group_members.c.group_id == group_id, group_members.c.is_admin == True) \
        .count()
    
    if admin_count == 1 and group.is_admin(current_user):
        flash('You cannot leave the group as you are the only admin', 'error')
        return redirect(url_for('group_detail', group_id=group_id))
    
    # Remove user from group
    db.session.query(group_members) \
        .filter(group_members.c.user_id == current_user.id, group_members.c.group_id == group_id) \
        .delete(synchronize_session=False)
    db.session.commit()
    
    flash(f'You have left {group.name}', 'success')
    return redirect(url_for('groups'))

@app.route('/create_group_post/<group_id>', methods=['POST'])
@login_required
def create_group_post(group_id):
    group = Group.query.get_or_404(group_id)
    
    if not group.is_member(current_user):
        flash('You must be a member of the group to post', 'error')
        return redirect(url_for('group_detail', group_id=group_id))
    
    content = request.form.get('content')
    
    if not content and 'image' not in request.files:
        flash('Post cannot be empty', 'error')
        return redirect(url_for('group_detail', group_id=group_id))
    
    if content and len(content) > 900:
        flash('Post cannot exceed 900 characters', 'error')
        return redirect(url_for('group_detail', group_id=group_id))
    
    image_url = None
    if 'image' in request.files:
        image_file = request.files['image']
        if image_file and image_file.filename != '':
            image_url = save_image(image_file)
    
    new_post = GroupPost(
        content=content or '',  # Allow empty content if image is present
        image_url=image_url,
        user_id=current_user.id,
        group_id=group_id
    )
    
    db.session.add(new_post)
    db.session.commit()
    
    flash('Post created successfully', 'success')
    return redirect(url_for('group_detail', group_id=group_id))

@app.route('/ai-tutor')
@login_required
def ai_tutor():
    # Get or create the user's active conversation
    conversation = AiConversation.query.filter_by(user_id=current_user.id).order_by(AiConversation.created_at.desc()).first()
    
    if not conversation:
        # Create new conversation first and commit to get an ID
        conversation = AiConversation(user_id=current_user.id)
        db.session.add(conversation)
        db.session.commit()
        
        # Now add initial AI message with instructions
        welcome_message = AiMessage(
            conversation_id=conversation.id,
            content="Hello! I'm your AI Tutor. How can I help you today?\n\nYou can ask me questions about Mathematics, Science, English, Literature, History, and many other subjects!",
            is_user=False
        )
        db.session.add(welcome_message)
        db.session.commit()
    
    messages = conversation.messages
    return render_template('ai_tutor.html', messages=messages, conversation=conversation)

@app.route('/ai-tutor/send', methods=['POST'])
@login_required
def ai_tutor_send():
    message_content = request.form.get('message')
    conversation_id = request.form.get('conversation_id')
    
    if not message_content:
        return jsonify({'error': 'Message cannot be empty'}), 400
    
    # Get or create conversation
    if conversation_id:
        conversation = AiConversation.query.get(conversation_id)
        if not conversation or conversation.user_id != current_user.id:
            return jsonify({'error': 'Invalid conversation'}), 403
    else:
        conversation = AiConversation(user_id=current_user.id)
        db.session.add(conversation)
        db.session.commit()
    
    # Save user message
    user_message = AiMessage(
        conversation_id=conversation.id,
        content=message_content,
        is_user=True
    )
    db.session.add(user_message)
    db.session.commit()
    
    try:
        # Get conversation history for context
        conversation_history = AiMessage.query.filter_by(conversation_id=conversation.id).order_by(AiMessage.created_at).limit(10).all()
        
        # Generate AI response using Gemini API
        ai_response = generate_ai_response(message_content, conversation_history)
        
        # Save AI response
        ai_message = AiMessage(
            conversation_id=conversation.id,
            content=ai_response,
            is_user=False
        )
        db.session.add(ai_message)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'user_message': {
                'id': user_message.id,
                'content': user_message.content,
                'created_at': user_message.created_at.strftime('%Y-%m-%d %H:%M:%S')
            },
            'ai_message': {
                'id': ai_message.id,
                'content': ai_message.content,
                'created_at': ai_message.created_at.strftime('%Y-%m-%d %H:%M:%S')
            }
        })
    except Exception as e:
        # If something fails, provide a graceful fallback
        fallback_response = "I'm sorry, I'm having trouble processing your request right now. Please try again in a moment."
        
        ai_message = AiMessage(
            conversation_id=conversation.id,
            content=fallback_response,
            is_user=False
        )
        db.session.add(ai_message)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'user_message': {
                'id': user_message.id,
                'content': user_message.content,
                'created_at': user_message.created_at.strftime('%Y-%m-%d %H:%M:%S')
            },
            'ai_message': {
                'id': ai_message.id,
                'content': fallback_response,
                'created_at': ai_message.created_at.strftime('%Y-%m-%d %H:%M:%S')
            },
            'error': str(e)
        })

@app.route('/ai-tutor/clear', methods=['POST'])
@login_required
def clear_ai_conversation():
    # Create a new conversation for the user
    new_conversation = AiConversation(user_id=current_user.id)
    db.session.add(new_conversation)
    db.session.commit()
    
    # Add initial welcome message
    welcome_message = AiMessage(
        conversation_id=new_conversation.id,
        content="Hello! I'm your AI Tutor. How can I help you today?\n\nYou can ask me questions about Mathematics, Science, English, Literature, History, and many other subjects!",
        is_user=False
    )
    db.session.add(welcome_message)
    db.session.commit()
    
    return jsonify({'success': True, 'conversation_id': new_conversation.id})

@app.route('/notifications')
@login_required
def notifications():
    return render_template('notifications.html')

@app.route('/api/user-votes')
@login_required
def user_votes():
    # Get all votes for the current user
    post_votes = Vote.query.filter_by(user_id=current_user.id, group_post_id=None).all()
    group_post_votes = Vote.query.filter_by(user_id=current_user.id).filter(Vote.group_post_id.isnot(None)).all()
    
    votes_dict = {vote.post_id: vote.vote_type for vote in post_votes if vote.post_id}
    group_votes_dict = {vote.group_post_id: vote.vote_type for vote in group_post_votes if vote.group_post_id}
    
    return jsonify({
        'votes': votes_dict,
        'group_votes': group_votes_dict
    })

@app.route('/api/search-users')
def search_users():
    query = request.args.get('q', '')
    if not query or len(query) < 2:
        return jsonify([])
    
    # Search for users by username or email
    users = User.query.filter(
        (User.username.ilike(f'%{query}%') | User.email.ilike(f'%{query}%'))
    ).limit(10).all()
    
    results = [{
        'id': user.id,
        'username': user.username,
        'avatar_url': user.avatar_url
    } for user in users]
    
    return jsonify(results)

# Error handlers
@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_server_error(e):
    return render_template('500.html'), 500 