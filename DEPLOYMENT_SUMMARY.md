# Report Guardian Viewer - Deployment Summary

## Dashboard Successfully Deployed!

Your read-only dashboard for Azeez is now live and ready to use.

### Access Information

**Dashboard URL:** http://report-guardian-dashboard.s3-website-eu-west-1.amazonaws.com

**Password:** `azeez`

### What's Included

The dashboard provides a beautiful, read-only interface showing:

1. **Executive Summary**
   - Annual Contract Value (2025)
   - Active SOWs count
   - Active Resources count
   - Average Contractor Margin
   - Customer breakdown with SOW and resource counts

2. **Statements of Work**
   - Complete list with status, values, and dates
   - Monthly summary showing SOWs signed by month
   - Total SOW value and date range

3. **Purchase Orders**
   - All POs with status and dates
   - Open vs Closed count
   - PO receipt status

4. **Resources**
   - All resource assignments
   - Contractor margins
   - Active vs Inactive status
   - Customer breakdown

5. **Risks/Issues/Decisions**
   - RAG status indicators (Red/Amber/Green)
   - Full risk tracking details

6. **PO-Resource Hierarchy** (Visual Tree Structure)
   - Hierarchical tree view with collapsible sections: SOW → PO → Resources
   - Grouped by customer and SOW, showing all POs and their resource assignments
   - Active vs Ended mappings separated into distinct groups
   - Resource assignment dates showing when they joined/left each PO
   - Dual status tracking: Resource employment status + PO assignment status
   - Contractor margins and sell rates visible per resource
   - Status indicators at all levels (SOW, PO, and resource mapping)

7. **PO Forecasting**
   - Historical forecasts
   - Detailed cost breakdowns

8. **Recent Changes (Audit Trail)**
   - Last 7 days of changes
   - Field-level tracking
   - Old vs New value comparisons

### Features

- **Password Protected**: Only accessible with password
- **Read-Only**: All APIs are GET requests - no modifications possible
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Auto-Refresh**: Click refresh button to get latest data
- **Modern UI**: Clean, professional interface with McKinsey-style design
- **Fast Loading**: Optimized with caching

### Security & Access Management

To **revoke access** when Azeez leaves:

1. Edit `/Users/gianlucaformica/Projects/report-guardian-viewer/app.js`
2. Change line 7: `PASSWORD: 'azeez'` to a new password
3. Commit and push to GitHub:
   ```bash
   cd /Users/gianlucaformica/Projects/report-guardian-viewer
   git add app.js
   git commit -m "Change password"
   git push
   ```
4. GitHub Actions will automatically redeploy (takes ~30 seconds)

### Technical Details

**Repository:** https://github.com/formicag/report-guardian-viewer

**AWS Resources Created:**
- S3 Bucket: `report-guardian-dashboard` (eu-west-1)
- IAM User: `github-actions-report-guardian-viewer`
- All resources tagged for cost tracking

**API Endpoint:** https://37ev13bzmk.execute-api.us-east-1.amazonaws.com/dev

**Read-Only APIs Used:**
- GET /api/contracts
- GET /api/purchase-orders
- GET /api/resources
- GET /api/risks
- GET /api/po-mappings
- GET /api/audit
- GET /api/forecasts

**Auto-Deployment:**
- Any push to `main` branch triggers automatic deployment
- GitHub Actions syncs files to S3
- Changes go live in ~30 seconds

### Cost Tracking

All AWS resources are tagged with:
- Project: `report-guardian-viewer`
- Environment: `production`
- ManagedBy: `github-actions`
- Owner: `gianluca-formica`
- CostCenter: `engineering`
- Application: `contractor-management`

### India Access

The dashboard will work perfectly from India:
- Static website hosted on AWS
- No geo-restrictions
- Fast global access via AWS edge locations

### Making Changes

To update the dashboard:

1. Edit files in `/Users/gianlucaformica/Projects/report-guardian-viewer`
2. Commit and push:
   ```bash
   git add .
   git commit -m "Your changes"
   git push
   ```
3. GitHub Actions automatically deploys

### Support

If you need to make changes or have issues:
- Repository: https://github.com/formicag/report-guardian-viewer
- Project Directory: `/Users/gianlucaformica/Projects/report-guardian-viewer`
- View deployment logs: `gh run list --repo formicag/report-guardian-viewer`

---

**Built with Claude Code** - https://claude.com/claude-code
