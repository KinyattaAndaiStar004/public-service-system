Kenyan Voice — Public Service Request System

**A mini eCitizen-style web application for reporting and tracking public service issues in Kenya.**

## Overview

Kenyan Voice allows citizens to report local public service problems and track their progress. Administrators can view submitted requests, monitor service statistics, and update request statuses.

This project was developed as an ICT internship assessment project.

> **Disclaimer:** Kenyan Voice is an independent demonstration project. It is not an official Government of Kenya or eCitizen website and is not affiliated with any government agency.

## Features

### Citizen Features
- Citizen registration and login using Firebase Authentication.
- Submit public service requests with a category, location, and description.
- Optional image attachments.
- View submitted requests and their current statuses.
- Filter requests by status.
- View request statistics.

### Administrator Features
- Administrator access restricted by the configured administrator account and Firestore security rules.
- View submitted public service requests.
- Search and filter requests.
- View request details and citizen information.
- Update request status:
  - Pending
  - In Progress
  - Resolved
- View statistics for submitted, pending, in-progress, and resolved requests.

## Technology Stack

- HTML5
- CSS3
- JavaScript (ES modules)
- Firebase Authentication
- Cloud Firestore
- Cloudinary for optional image uploads

## Project Structure
public-service-system/
├── assets/
├── css/
├── html/
├── js/
│   ├── auth.js
│   ├── main.js
│   ├── dashboard.js
│   ├── admin.js
│   └── firebase-config.js
├── index.html
├── login.html
├── register.html
├── dashboard.html
├── admin.html
└── README.md
*Adjust the structure above to match the actual files and folders in your repository.*

## Setup and Installation

1. Clone or download the repository.
2. Open the project in Visual Studio Code.
3. Configure Firebase Authentication with the Email/Password provider.
4. Create a Cloud Firestore database.
5. Add your Firebase web configuration to `firebase-config.js`.
6. Configure the required Firestore security rules.
7. Configure Cloudinary if optional image uploads are enabled.
8. Run the project using VS Code Live Server or another local web server.


Firebase web configuration is intended for client-side applications, but Firestore security rules must protect private records and administrator actions. Never commit Firebase Admin SDK credentials, service-account keys, passwords, or other server secrets.

## Data and Security

The application uses Firebase Authentication for user identity and Cloud Firestore for request and profile data. Citizens should only be able to access their own requests, while authorized administrators can manage requests.

Before production use, review and test the Firestore security rules, validate submitted data, restrict upload types and sizes, and protect sensitive citizen information.

## Deployment

The application can be deployed using a static hosting service such as Firebase Hosting or GitHub Pages.
I will use netlify.

Because the application uses Firebase modules, authentication, and Firestore, it must be served over HTTP/HTTPS rather than opened directly as a local file:// page.

## Future Improvements

Email notifications when request statuses change.

Pagination for large request lists.

More detailed service analytics.

Improved form validation and accessibility.

Automated tests and stronger administrative access controls.

## NOTE
### Admin Login (Assessment Demo)

Admin login credentials are provided separately to the assessment team for testing and demonstration purposes.

## Author

Kinyatta Alice Andai

Developed as a public service request system demonstration for an ICT internship assessment.

Project: Kenyan Voice
Credit: StarTech Solutions