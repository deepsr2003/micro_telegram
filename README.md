# micro_telegram
Micro-Telegram is a complete, end-to-end web application that emulates the core functionalities of a real-time messaging service like Telegram or Discord .


Micro-Telegram is a complete, end-to-end web application that emulates the core functionalities of a real-time messaging service like Telegram or Discord. It features a unique, text-based terminal aesthetic, but is built on a modern, robust technology stack. The application supports user authentication, direct messaging, group chat rooms, and comprehensive admin/moderation controls.
This project was built from the ground up to serve as a comprehensive portfolio piece, demonstrating a wide range of skills in both frontend and backend development, database design, real-time communication, and application security.

<img width="1393" height="836" alt="Screenshot 2025-07-25 at 2 21 28 AM" src="https://github.com/user-attachments/assets/4c74aae6-dcaf-4461-97f0-00ccbcb0a46f" />
<img width="1390" height="834" alt="Screenshot 2025-07-25 at 2 21 50 AM" src="https://github.com/user-attachments/assets/bba61ab2-41f4-4363-b9c3-ffa91c8b1c79" />
<img width="1393" height="833" alt="Screenshot 2025-07-25 at 2 22 12 AM" src="https://github.com/user-attachments/assets/f9e61447-2074-47e9-b143-7662c0b0fa3b" />
<img width="1392" height="840" alt="Screenshot 2025-07-25 at 2 22 20 AM" src="https://github.com/user-attachments/assets/966346d9-6f9f-4f77-aeed-554f6909089f" />
<img width="1396" height="840" alt="Screenshot 2025-07-25 at 2 22 29 AM" src="https://github.com/user-attachments/assets/74d0039d-d278-4e01-910d-22e941e41bc4" />





Core Features
Secure User Authentication: JWT-based authentication flow with hashed passwords (bcrypt) for secure login and signup.
Protected Routes & API: All sensitive user data and actions are protected, accessible only with a valid JSON Web Token.
Real-Time Chat: Live, bidirectional communication using WebSockets (socket.io) for instant message delivery.
Group Chat Rooms:
Users can create public chat rooms with unique IDs.
Room creators have 'creator' privileges.
A robust admin system allows promoting members to 'admin' roles.
1-on-1 Direct Messaging: Users can add each other as contacts and engage in private, real-time conversations.
Contact Management System:
Send, accept, or reject contact requests.
Live notifications for pending requests and updates.
Comprehensive Admin Powers:
Admins can delete any message in a room.
Admins can remove non-admin members from a room.
A request/approve system allows admins to manage who joins a room.
Polished UI: A modern, three-column dashboard layout with a unique, terminal-inspired aesthetic, built to be responsive and intuitive.
Technical Architecture & Stack
This project was architected as a full-stack monorepo using pnpm workspaces, a modern approach that co-locates the client and server code for streamlined development and dependency management.


Technology Stack:

Frontend:
Framework: React (with Vite for a lightning-fast development experience).
State Management: React Context API and Hooks for clean, centralized state management (e.g., AuthContext, SocketContext).
Routing: react-router-dom for client-side navigation.

Styling: Standard CSS with a focus on a clean, terminal-like aesthetic.

Backend:
Framework: Node.js with Express.js for building a robust and scalable RESTful API.

Real-time Engine: WebSockets, implemented with the powerful socket.io library.

Authentication: JSON Web Tokens (JWT) for stateless API security.

Security: bcrypt for one-way password hashing.


Database:
Type: MySQL (Relational Database).
Schema: A well-designed relational schema with foreign key constraints (ON DELETE CASCADE) to ensure data integrity across users, rooms, messages, and contacts tables.

Architectural Highlights:
RESTful API & WebSocket Hybrid: The application uses a standard REST API for stateless actions like authentication, fetching user/room lists, and loading message history. For all live interactions (sending/receiving messages, notifications, admin actions), it seamlessly transitions to a stateful WebSocket connection.

Decoupled Frontend/Backend: The client and server are completely independent. The React client consumes the Express API, a standard and highly scalable architecture.

Component-Based UI: The React frontend is broken down into logical, reusable components (RoomsSidebar, ContactsSidebar, ChatPanel), promoting clean code and maintainability.

Centralized State & Logic: Global state like user authentication and the socket connection is managed in React Context, preventing "prop drilling" and making state accessible throughout the application.

Optimistic UI Updates: To create a snappy user experience, actions like sending a message update the UI instantly on the client-side before receiving confirmation from the server.


What's Special About This Project?
Beyond being a simple chat app, Micro-Telegram demonstrates a deeper understanding of the complexities involved in building modern, interactive web applications:
Comprehensive Feature Set: It goes beyond basic chat to include nuanced social features like contact requests and a full-fledged admin hierarchy, which requires careful database and business logic design.
Real-World Security Practices: It correctly implements industry-standard authentication and security, including JWTs, password hashing, protected API routes, and role-based access control (isRoomAdmin middleware).
Robust Real-Time Design: The WebSocket implementation is not trivial. It correctly maps users to sockets, targets specific users for direct messages, broadcasts to specific rooms, and handles real-time UI updates for all connected clients when an admin action occurs (like deleting a message).
Attention to User Experience: The project tackles real-world UI/UX challenges, such as preventing browsers from blocking confirm() dialogs by implementing a non-blocking, in-app notification system for join requests. The chat window's overflow and scrolling behavior is also intentionally designed for a natural feel.
Modern Development Workflow: The use of a pnpm monorepo, ES Modules on the backend ("type": "module"), and Vite on the frontend represents a cutting-edge, professional development setup.
