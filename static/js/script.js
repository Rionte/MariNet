// MariNet main JavaScript file

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Bootstrap tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Flash message auto-dismiss
    const flashMessages = document.querySelectorAll('.alert-dismissible');
    flashMessages.forEach(function(message) {
        setTimeout(function() {
            const closeButton = message.querySelector('.btn-close');
            if (closeButton) {
                closeButton.click();
            }
        }, 5000); // Auto-dismiss after 5 seconds
    });
    
    // Get current vote status and apply active classes to vote buttons
    function checkVoteStatus() {
        const voteBtns = document.querySelectorAll('.vote-btn');
        if (voteBtns.length === 0) return;
        
        // Make a single request to get all votes for the current user
        fetch('/api/user-votes')
            .then(response => response.json())
            .then(data => {
                voteBtns.forEach(btn => {
                    const postId = btn.dataset.postId;
                    const voteType = btn.dataset.voteType;
                    
                    if (data.votes[postId] === voteType) {
                        btn.classList.add(voteType === 'upvote' ? 'active-upvote' : 'active-downvote');
                    }
                });
            })
            .catch(error => console.error('Error fetching votes:', error));
    }
    
    // Try to run vote status check if user is logged in
    if (document.querySelector('.vote-btn')) {
        checkVoteStatus();
    }
    
    // Format dates to relative time (e.g., "2 hours ago")
    function formatRelativeTime() {
        const dateElements = document.querySelectorAll('.relative-time');
        
        dateElements.forEach(element => {
            const timestamp = new Date(element.dataset.timestamp);
            const now = new Date();
            const diffMs = now - timestamp;
            const diffSec = Math.floor(diffMs / 1000);
            const diffMin = Math.floor(diffSec / 60);
            const diffHour = Math.floor(diffMin / 60);
            const diffDay = Math.floor(diffHour / 24);
            
            let relativeTime;
            
            if (diffDay > 30) {
                // Format as regular date for older posts
                relativeTime = timestamp.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: now.getFullYear() !== timestamp.getFullYear() ? 'numeric' : undefined
                });
            } else if (diffDay > 0) {
                relativeTime = `${diffDay}d ago`;
            } else if (diffHour > 0) {
                relativeTime = `${diffHour}h ago`;
            } else if (diffMin > 0) {
                relativeTime = `${diffMin}m ago`;
            } else {
                relativeTime = 'Just now';
            }
            
            element.textContent = relativeTime;
        });
    }
    
    // Format dates on page load
    formatRelativeTime();
});

// Functions to handle image preview before upload
function previewImage(inputId, imgId) {
    const input = document.getElementById(inputId);
    const imgPreview = document.getElementById(imgId);
    
    if (!input || !imgPreview) return;
    
    input.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                imgPreview.src = e.target.result;
                imgPreview.style.display = 'block';
            };
            
            reader.readAsDataURL(this.files[0]);
        }
    });
} 