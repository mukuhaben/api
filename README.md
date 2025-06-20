# FirstCraft E-commerce Application

A full-stack e-commerce application built with React.js frontend and Node.js/Express backend with PostgreSQL database.

##  Features

- **User Management**: Registration, login, profile management
- **Product Management**: CRUD operations for products with pricing tiers
- **Order Management**: Complete order processing workflow
- **Payment Integration**: M-Pesa and KCB Bank payment gateways
- **Wallet System**: Cashback and commission tracking
- **Admin Dashboard**: Comprehensive admin panel for managing the platform
- **Sales Agent Portal**: Commission tracking and customer management
- **Responsive Design**: Mobile-first responsive UI

##  Tech Stack

### Frontend
- React.js 18
- Material-UI (MUI)
- React Router DOM
- Axios for API calls
- React Query for state management
- Vite for build tooling
cd livetest/frontend
npm install axios
# If using CSV import functionality
cd livetest/frontend
npm install axios
npm install papaparse xlsx
### Backend
- Node.js with Express.js
- PostgreSQL database
- JWT authentication
- Bcrypt for password hashing
- Nodemailer for email services
- Multer for file uploads

##  Prerequisites

Before running this application, make sure you have the following installed:

- Node.js (v18 or higher)
- npm (v8 or higher)
- PostgreSQL (v12 or higher)
- Git

## 🔧 Installation & Setup

### 1. Clone the Repository

\`\`\`bash
git clone <repository-url>
cd firstcraft-ecommerce
\`\`\`

### 2. Backend Setup

\`\`\`bash
cd backend
npm install
\`\`\`

### 3. Frontend Setup

\`\`\`bash
cd frontend
npm install
\`\`\`

### 4. Database Setup

1. Create a PostgreSQL database:
\`\`\`sql
CREATE DATABASE firstcraft_ecommerce;
\`\`\`

2. Update the database configuration in \`backend/.env\`:
\`\`\`env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=firstcraft_ecommerce
DB_USER=your_username
DB_PASSWORD=your_password
\`\`\`

### 5. Environment Variables

#### Backend (.env)
Create a \`.env\` file in the backend directory with the following variables:

\`\`\`env
# Server Configuration
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=firstcraft_ecommerce
DB_USER=postgres
DB_PASSWORD=admin123
DB_SSL=false

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your_refresh_secret_key_here
JWT_REFRESH_EXPIRES_IN=7d

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
FROM_NAME=FirstCraft Ltd
FROM_EMAIL=noreply@firstcraft.com

# Payment Gateways (Optional)
MPESA_CONSUMER_KEY=your_mpesa_consumer_key
MPESA_CONSUMER_SECRET=your_mpesa_consumer_secret
MPESA_ENVIRONMENT=sandbox
\`\`\`

#### Frontend (.env)
Create a \`.env\` file in the frontend directory:

\`\`\`env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_NAME=FirstCraft E-commerce
\`\`\`

### 6. Database Migration and Seeding

\`\`\`bash
cd backend
npm run migrate
npm run seed
\`\`\`

##  Running the Application

### Development Mode

1. Start the backend server:
\`\`\`bash
cd backend
npm run dev
\`\`\`

2. Start the frontend development server:
\`\`\`bash
cd frontend
npm run dev
\`\`\`

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

### Production Mode

1. Build the frontend:
\`\`\`bash
cd frontend
npm run build
\`\`\`

2. Start the backend in production:
\`\`\`bash
cd backend
npm start
\`\`\`

##  Default User Accounts

After seeding the database, you can use these default accounts:

- **Admin**: admin@firstcraft.com / admin123
- **Sales Agent**: agent@firstcraft.com / agent123
- **Customer**: customer@example.com / customer123

##  Project Structure

\`\`\`
firstcraft-ecommerce/
├── backend/
│   ├── src/
│   │   ├── config/          # Database and app configuration
│   │   ├── controllers/     # Route controllers
│   │   ├── middlewares/     # Custom middlewares
│   │   ├── routes/          # API routes
│   │   ├── scripts/         # Database scripts
│   │   ├── utils/           # Utility functions
│   │   └── server.js        # Main server file
│   ├── .env                 # Environment variables
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   ├── hooks/           # Custom hooks
│   │   └── main.jsx         # Main React file
│   ├── .env                 # Environment variables
│   └── package.json
└── README.md
\`\`\`

##  API Endpoints

### Authentication
- \`POST /api/auth/register\` - User registration
- \`POST /api/auth/login\` - User login
- \`POST /api/auth/logout\` - User logout
- \`POST /api/auth/refresh-token\` - Refresh JWT token

### Products
- \`GET /api/products\` - Get all products
- \`GET /api/products/:id\` - Get product by ID
- \`POST /api/products\` - Create product (Admin only)
- \`PUT /api/products/:id\` - Update product (Admin only)
- \`DELETE /api/products/:id\` - Delete product (Admin only)

### Orders
- \`GET /api/orders\` - Get all orders
- \`POST /api/orders\` - Create new order
- \`GET /api/orders/:id\` - Get order by ID
- \`PUT /api/orders/:id\` - Update order

### Users
- \`GET /api/users/profile\` - Get user profile
- \`PUT /api/users/profile\` - Update user profile
- \`GET /api/users\` - Get all users (Admin only)

##  Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- Input validation and sanitization
- CORS protection
- Security headers with Helmet
- SQL injection prevention

##  Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify PostgreSQL is running
   - Check database credentials in .env file
   - Ensure database exists

2. **CORS Issues**
   - Verify FRONTEND_URL in backend .env
   - Check VITE_API_BASE_URL in frontend .env

3. **Port Already in Use**
   - Change PORT in backend .env
   - Update VITE_API_BASE_URL accordingly

4. **Module Not Found Errors**
   - Run \`npm install\` in both directories
   - Clear node_modules and reinstall if needed

### Debug Mode

Enable debug logging by setting:
\`\`\`env
NODE_ENV=development
LOG_LEVEL=debug
\`\`\`

##  API Documentation

For detailed API documentation, start the server and visit:
http://localhost:3000/api-docs

##  Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request



##  Deployment

### Environment Setup for Production

1. Set NODE_ENV=production in backend .env
2. Use production database credentials
3. Set secure JWT secrets
4. Configure production email settings
5. Set up SSL certificates
6. Configure reverse proxy (nginx)

### Docker Deployment (Optional)

\`\`\`dockerfile
# Dockerfile example for backend
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
\`\`\`

This README provides comprehensive setup instructions and troubleshooting guidance for the FirstCraft e-commerce application.
