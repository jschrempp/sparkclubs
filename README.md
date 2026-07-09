# Spark Clubs - Discussion Group Management Platform

A modern web-based platform for managing discussion groups with features for member management, topic tracking, event scheduling, and role-based access control.

## 🌟 Features

### For All Members
- **User Management**: Create and manage your account with profile customization
- **Club Discovery**: Browse and join public discussion clubs in your area
- **Topic Participation**: Express interest in discussion topics, volunteer to lead, or mark topics as not interested
- **Event RSVP**: View upcoming club events and RSVP to attend
- **Multi-Club Membership**: Join and participate in multiple clubs simultaneously

### For Club Admins
- **Club Management**: Create and configure clubs (public/private, auto-approve settings)
- **Member Approval**: Review and approve membership requests
- **Topic Moderation**: Approve, activate, or hide discussion topics
- **Event Creation**: Schedule events and associate them with multiple topics
- **Host Rotation**: Manage hosting duties across members
- **Detailed Analytics**: View member interests and engagement metrics

### For Site Admins
- **User Administration**: Manage user accounts and permissions across the platform
- **Club Oversight**: Moderate all clubs with full administrative access
- **System Configuration**: Control auto-approval settings for users and memberships
- **Reporting**: Export member lists and generate activity reports

## 🏗️ Technical Architecture

### Backend
- **Framework**: Django 4.x with Django REST Framework
- **Database**: MySQL 8.0+ with InnoDB engine
- **Authentication**: JWT-based authentication with optional Google OAuth
- **API**: RESTful API architecture with comprehensive endpoints

### Frontend
- **Framework**: React 18
- **Routing**: React Router v6
- **Styling**: Custom CSS with responsive mobile-first design
- **State Management**: React Context API for authentication

### Data Models

#### Core Models
- **User**: Email-based authentication with user types (pending, member, site_admin, super_admin)
- **Club**: Discussion groups with visibility controls and auto-approval settings
- **ClubMembership**: Join relationship between users and clubs with admin flags
- **Topic**: Discussion topics with title, description, tags, and status
- **TopicInterest**: Track member interest levels (interested, able_to_lead, not_interested, unspecified)
- **Event**: Scheduled club meetings with multiple associated topics
- **EventTopic**: Many-to-many relationship between events and topics
- **EventAttendance**: RSVP tracking for events
- **SystemSettings**: Platform-wide configuration options

## 🚀 Getting Started

### Prerequisites
- Python 3.9+
- Node.js 16+ and npm
- MySQL 8.0+
- Git

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd jschrempp.sparkclubs
   ```

2. **Create and activate virtual environment**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure database**
   - Create a MySQL database
   - Update `backend/sparkclubs/settings.py` with your database credentials
   ```python
   DATABASES = {
       'default': {
           'ENGINE': 'django.db.backends.mysql',
           'NAME': 'your_database_name',
           'USER': 'your_username',
           'PASSWORD': 'your_password',
           'HOST': 'localhost',
           'PORT': '3306',
       }
   }
   ```

5. **Run migrations**
   ```bash
   python manage.py migrate
   ```

6. **Create superuser**
   ```bash
   python manage.py createsuperuser
   ```

7. **Start development server**
   ```bash
   python manage.py runserver
   ```

The API will be available at `http://localhost:8000/api/`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   - Create `.env` file in frontend directory
   ```
   REACT_APP_API_URL=http://localhost:8000/api
   ```

4. **Start development server**
   ```bash
   npm start
   ```

The application will open at `http://localhost:3000`

## 📊 Database Schema

### Key Relationships
- Users can belong to multiple Clubs (via ClubMembership)
- Clubs have multiple Topics
- Topics can have multiple member interests (via TopicInterest)
- Events belong to one Club and can have multiple Topics (via EventTopic)
- Members can RSVP to Events (via EventAttendance)

### Interest Types
Topics support four interest levels:
- **Interested**: Member wants to participate in discussion
- **Able to Lead**: Member can facilitate/present the topic
- **Not Interested**: Member is not interested in this topic
- **Unspecified**: No preference indicated

## 🔐 User Roles & Permissions

### Super Admin
- All site admin permissions
- Promote/demote super admins
- Delete clubs and past events
- Access to all system features

### Site Admin
- View and manage all users (except super admins)
- Moderate all clubs
- Promote members to club admins
- Change club visibility settings
- Cannot modify super admin accounts

### Club Admin
- Approve/remove club members
- Moderate topics (approve, activate, hide)
- Create and manage events
- Manage host rotation
- View detailed member interest data

### Member
- Join public clubs
- Create new clubs (subject to limit)
- Propose discussion topics
- Express interest in topics
- RSVP to events
- View club members and upcoming events

### Pending User
- New accounts awaiting approval
- Limited access until promoted by admin

## 🎨 Frontend Pages

- **Landing**: Welcome page with registration/login
- **Dashboard**: Personalized view of memberships and upcoming events
- **Clubs**: Browse and search for clubs
- **Club Detail**: View topics, events, and members for a specific club
- **Admin Panel**: Site-wide administration (admins only)
- **About**: Information about the platform

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register/` - Create new account
- `POST /api/auth/login/` - Login with email/password
- `POST /api/auth/google/` - OAuth login (if enabled)
- `GET /api/auth/me/` - Get current user profile
- `GET /api/auth/my-memberships/` - Get user's club memberships
- `GET /api/auth/my-events/` - Get user's upcoming events

### Clubs
- `GET /api/clubs/` - List clubs
- `POST /api/clubs/` - Create club
- `GET /api/clubs/{id}/` - Get club details
- `PATCH /api/clubs/{id}/` - Update club
- `DELETE /api/clubs/{id}/` - Delete club (super admin only)
- `POST /api/clubs/{id}/join/` - Join club
- `POST /api/clubs/{id}/leave/` - Leave club
- `GET /api/clubs/{id}/members/` - Get club members

### Topics
- `GET /api/topics/?club={id}` - List topics for a club
- `POST /api/topics/` - Create topic
- `PATCH /api/topics/{id}/` - Update topic
- `POST /api/topics/{id}/set_interest/` - Set interest level
- `DELETE /api/topics/{id}/remove_interest/` - Remove interest
- `GET /api/topics/{id}/interested_users/` - Get interested members (admin)

### Events
- `GET /api/events/?club={id}` - List events for a club
- `POST /api/events/` - Create event
- `PATCH /api/events/{id}/` - Update event
- `POST /api/events/{id}/rsvp/` - RSVP to event
- `DELETE /api/events/{id}/cancel_rsvp/` - Cancel RSVP
- `GET /api/events/{id}/attendees/` - Get event attendees

### Memberships
- `POST /api/memberships/{id}/approve/` - Approve pending member
- `POST /api/memberships/{id}/remove/` - Remove member
- `POST /api/memberships/{id}/set_admin/` - Toggle admin status
- `POST /api/memberships/{id}/set_host_order/` - Set host rotation order

### Users (Admin only)
- `GET /api/users/` - List all users
- `POST /api/users/{id}/update_user_type/` - Change user type
- `POST /api/users/{id}/increase_club_limit/` - Increase club creation limit

### System Settings (Super Admin only)
- `GET /api/system-settings/` - Get settings
- `PATCH /api/system-settings/update/` - Update settings

## 🛠️ Management Commands

### Erase Clubs and Topics
```bash
python manage.py erase_clubs_and_books
```
Removes all clubs, topics, and related data (keeps users).

## 🚢 Deployment

The application is configured for deployment on Railway.app with separate frontend and backend services.

### Backend Deployment
- Uses `nixpacks.toml` for build configuration
- Runs via `start.sh` script
- Requires MySQL database connection
- Set environment variables in Railway dashboard

### Frontend Deployment
- Static React build served via simple server
- Environment variables configured in Railway
- Automatic versioning via `generate-version.js`

## 🤝 Contributing

### Code Style
- Python: Follow PEP 8 guidelines
- JavaScript: Use ES6+ features, consistent naming
- Comments: Document complex logic and API contracts

### Git Workflow
1. Create feature branch from main
2. Make changes with descriptive commits
3. Test thoroughly before merging
4. Submit pull request for review

## 📄 License

This project is proprietary software. All rights reserved.

## 👥 Support

For questions or issues:
- Create an issue in the repository
- Contact the development team
- Check the specifications document for detailed requirements

## 🗺️ Roadmap

### Planned Features
- Email notifications for events and approvals
- Discussion forums per topic
- Calendar integration (iCal, Google Calendar)
- Advanced search and filtering
- Member recommendations engine
- Mobile app (iOS/Android)
- Analytics dashboard for club admins
- CSV export for member lists and reports

## 🙏 Acknowledgments

Built with Django REST Framework and React for modern, scalable web applications.

---

**Version**: 1.1  
**Last Updated**: July 6, 2026  
**Platform**: Spark Clubs Discussion Management
