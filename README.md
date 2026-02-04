# TRM (Talent Referral Marketplace) Platform

<p align="center">
  <img src="public/trm-logo.svg" alt="TRM Logo" width="200"/>
</p>

<p align="center">
  <strong>Myanmar's Premier AI-Powered Referral Hiring Platform</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#documentation">Documentation</a> •
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18.x-green" alt="Node.js 18"/>
  <img src="https://img.shields.io/badge/React-18.x-blue" alt="React 18"/>
  <img src="https://img.shields.io/badge/MongoDB-6.x-green" alt="MongoDB 6"/>
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="License: MIT"/>
</p>

---

## 🎯 Overview

TRM is a comprehensive referral-based hiring platform built specifically for the Myanmar market. It connects talented job seekers with companies through a network of professional referrers, leveraging AI-powered resume optimization and gamification to create a unique hiring ecosystem.

### Key Highlights

- 🌏 **Myanmar-Focused**: Localized for Myanmar market with native payment integrations
- 🤖 **AI-Powered**: Resume optimization using Moonshot AI (Kimi)
- 💰 **Fair Compensation**: Transparent referral bonus system
- 🎮 **Gamified**: Points, badges, and tier system for engagement
- 🔒 **Secure**: Enterprise-grade security with KYC verification
- 📱 **Mobile-First**: Responsive web and native mobile apps

---

## ✨ Features

### For Referrers

- **Browse Jobs**: Search and filter jobs by location, salary, industry
- **Submit Referrals**: Easy referral submission with resume upload
- **Track Progress**: Real-time status updates on referrals
- **Earn Commissions**: 85% of referral bonus on successful hires
- **AI Resume Optimizer**: Improve candidate resumes with AI
- **Gamification**: Earn points, badges, and climb tiers
- **Payout Management**: Withdraw earnings via KBZPay, WavePay, or bank transfer

### For Companies

- **Post Jobs**: Create detailed job postings with custom requirements
- **Manage Referrals**: Review and track candidate referrals
- **Team Collaboration**: Multi-user access with role-based permissions
- **Analytics Dashboard**: Insights on hiring performance
- **Subscription Tiers**: Flexible plans from Starter to Enterprise
- **API Access**: Programmatic integration (Enterprise)

### For Admins

- **God Mode Dashboard**: Complete platform oversight
- **User Management**: Manage referrers, job seekers, and companies
- **Payout Processing**: Review and process withdrawal requests
- **KYC Verification**: Verify user identities
- **Analytics & Reporting**: Platform-wide statistics
- **Content Moderation**: Approve jobs and monitor content

### Platform Features

- **Real-time Notifications**: WebSocket-based updates
- **Multi-language Support**: English and Myanmar (Burmese)
- **Mobile Applications**: iOS and Android apps
- **Webhook Integration**: Event-driven notifications
- **Advanced Search**: Full-text search with filters
- **Data Export**: CSV, Excel, and PDF reports

---

## 🛠 Tech Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| **React 18** | UI Framework |
| **TypeScript** | Type Safety |
| **Vite** | Build Tool |
| **Tailwind CSS** | Styling |
| **shadcn/ui** | Component Library |
| **Framer Motion** | Animations |
| **Recharts** | Data Visualization |

### Backend

| Technology | Purpose |
|------------|---------|
| **Node.js** | Runtime |
| **Express.js** | Web Framework |
| **MongoDB** | Database |
| **Mongoose** | ODM |
| **Redis** | Caching & Sessions |
| **Bull** | Job Queue |
| **JWT** | Authentication |

### AI & ML

| Technology | Purpose |
|------------|---------|
| **Moonshot AI (Kimi)** | Resume Optimization |
| **OpenAI** | Additional AI features |
| **TensorFlow.js** | ML Models |

### DevOps

| Technology | Purpose |
|------------|---------|
| **Docker** | Containerization |
| **Nginx** | Reverse Proxy |
| **PM2** | Process Management |
| **GitHub Actions** | CI/CD |

### Third-Party Integrations

| Service | Purpose |
|---------|---------|
| **KBZPay** | Payment Gateway |
| **WavePay** | Payment Gateway |
| **SendGrid** | Email Service |
| **Twilio** | SMS Service |
| **AWS S3** | File Storage |
| **Cloudflare** | CDN & Security |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18.x or higher
- MongoDB 6.x
- Redis 7.x
- Git

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/your-org/trm-platform.git
cd trm-platform
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start development server**

```bash
# Start backend
npm run server:dev

# In another terminal, start frontend
npm run dev
```

5. **Access the application**

- Web App: http://localhost:5173
- API: http://localhost:5000/api/v1
- API Docs: http://localhost:5000/api/v1/docs

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f app
```

---

## 📚 Documentation

### API Documentation

Complete OpenAPI/Swagger specification available at:

- [OpenAPI Specification](docs/api/v1/openapi.yaml)
- [API Documentation](docs/api/)

### User Guides

- [Referrer Guide](docs/guides/referrer-guide.md) - How to submit referrals and earn
- [Company Guide](docs/guides/company-guide.md) - How to post jobs and manage hiring
- [Admin Guide](docs/guides/admin-guide.md) - Platform administration

### Technical Documentation

- [Architecture Overview](docs/technical/architecture.md) - System design and components
- [Database Schema](docs/technical/database-schema.md) - MongoDB collections and relationships
- [Deployment Guide](docs/technical/deployment.md) - Production deployment instructions

---

## 🏗 Project Structure

```
trm-platform/
├── docs/                       # Documentation
│   ├── api/                   # API documentation
│   ├── guides/                # User guides
│   └── technical/             # Technical docs
├── src/                        # Frontend source
│   ├── components/            # React components
│   ├── sections/              # Page sections
│   ├── contexts/              # React contexts
│   ├── hooks/                 # Custom hooks
│   ├── lib/                   # Utilities
│   └── services/              # API services
├── server/                     # Backend source
│   ├── routes/                # API routes
│   ├── middleware/            # Express middleware
│   ├── models/                # Mongoose models
│   ├── services/              # Business logic
│   ├── cron/                  # Scheduled jobs
│   └── ml/                    # ML models
├── mobile/                     # React Native app
├── k8s/                        # Kubernetes manifests
├── docker/                     # Docker configurations
└── plans/                      # Project specifications
```

---

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e

# Generate coverage report
npm run test:coverage
```

---

## 📦 Deployment

### Production Deployment

See [Deployment Guide](docs/technical/deployment.md) for detailed instructions.

Quick deployment with PM2:

```bash
# Build for production
npm run build

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 config
pm2 save
pm2 startup
```

### Environment Variables

Key environment variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (development/production) | Yes |
| `PORT` | Server port | Yes |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `JWT_ACCESS_SECRET` | JWT secret key | Yes |
| `REDIS_URL` | Redis connection URL | Yes |
| `MOONSHOT_API_KEY` | Moonshot AI API key | No |
| `AWS_S3_BUCKET` | S3 bucket name | No |

See `.env.example` for complete list.

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Run tests**
   ```bash
   npm test
   ```
5. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
6. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Code Standards

- **ESLint**: JavaScript/TypeScript linting
- **Prettier**: Code formatting
- **Conventional Commits**: Commit message format
- **Semantic Versioning**: Version numbering

### Development Workflow

1. Create an issue describing the bug/feature
2. Get approval from maintainers
3. Implement changes
4. Write/update tests
5. Update documentation
6. Submit PR for review

---

## 🔐 Security

### Reporting Security Issues

Please report security vulnerabilities to security@trm.com. Do not create public issues for security bugs.

### Security Features

- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Rate limiting on all endpoints
- Input validation and sanitization
- CSRF protection
- SQL/NoSQL injection prevention
- XSS protection
- Secure password hashing (bcrypt)
- 2FA support

---

## 📈 Roadmap

### Q1 2026

- [x] Core platform launch
- [x] AI Resume Optimizer
- [x] Mobile applications
- [x] Payment integrations

### Q2 2026

- [ ] Advanced analytics dashboard
- [ ] Referral network expansion
- [ ] Multi-language support (more languages)
- [ ] API v2

### Q3 2026

- [ ] AI-powered job matching
- [ ] Video interview integration
- [ ] Background check integration
- [ ] International expansion

### Q4 2026

- [ ] Blockchain-based credentials
- [ ] AI interview assistant
- [ ] Talent pool marketplace
- [ ] Enterprise features

---

## 📞 Support

### Getting Help

- **Documentation**: [docs.trm.com](https://docs.trm.com)
- **Email**: support@trm.com
- **Phone**: 09-XXX-XXX-XXX (9 AM - 6 PM Myanmar Time)
- **Live Chat**: Available on the platform

### Community

- **Discord**: [discord.gg/trm](https://discord.gg/trm)
- **Twitter**: [@TRMPlatform](https://twitter.com/TRMPlatform)
- **LinkedIn**: [TRM Platform](https://linkedin.com/company/trm)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Moonshot AI** for providing the AI resume optimization capabilities
- **Myanmar Developer Community** for feedback and support
- **Open Source Contributors** for the amazing tools we build upon

---

## 📊 Stats

<p align="center">
  <img src="https://img.shields.io/github/stars/your-org/trm-platform" alt="Stars"/>
  <img src="https://img.shields.io/github/forks/your-org/trm-platform" alt="Forks"/>
  <img src="https://img.shields.io/github/issues/your-org/trm-platform" alt="Issues"/>
  <img src="https://img.shields.io/github/license/your-org/trm-platform" alt="License"/>
</p>

---

<p align="center">
  <strong>Built with ❤️ in Myanmar</strong>
</p>

<p align="center">
  © 2026 TRM Platform. All rights reserved.
</p>
