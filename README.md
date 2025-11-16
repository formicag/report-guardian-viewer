# Report Guardian Viewer

Read-only dashboard for viewing Report Guardian data. This is a simple HTML/CSS/JavaScript application that provides a beautiful, interactive dashboard to view project data.

## Features

- **Password Protected**: Access controlled by password (currently hardcoded as 'azeez')
- **Read-Only**: Only fetches data from GET APIs - no modifications possible
- **Executive Summary**: Key metrics at a glance
  - Annual Contract Value
  - Active SOWs count
  - Active Resources count
  - Average Contractor Margin
- **Data Views**:
  - Statements of Work (with monthly summary)
  - Purchase Orders
  - Resources
  - Risks/Issues/Decisions
  - PO-Resource Hierarchy
  - PO Forecasting
  - Recent Changes (Audit Trail)
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Auto-Refresh**: Refresh button to reload latest data

## Tech Stack

- Pure HTML/CSS/JavaScript (no frameworks)
- Deployed on AWS S3 as static website
- CI/CD via GitHub Actions

## Security

- Password is hardcoded in `app.js` (line 7)
- To revoke access: Change the password in `app.js` and redeploy
- All API calls are read-only (GET requests only)
- CORS enabled on backend API

## Deployment

Automatically deployed to S3 via GitHub Actions on push to main branch.

S3 Bucket: `report-guardian-dashboard`
Region: `us-east-1`

## Local Development

Simply open `index.html` in a browser. The app will connect to the production API.

## API Endpoints Used

All endpoints are read-only:

- GET /api/contracts
- GET /api/purchase-orders
- GET /api/resources
- GET /api/risks
- GET /api/po-mappings
- GET /api/audit
- GET /api/forecasts

## Access Management

Current password: `azeez`

To change password:
1. Edit `app.js` line 7
2. Commit and push to GitHub
3. GitHub Actions will automatically redeploy

## Cost Tracking

All AWS resources are tagged with:
- Project: report-guardian-viewer
- Environment: production
- ManagedBy: github-actions
- Owner: gianluca-formica
