import { defineRailway, github, project, service } from 'railway/iac';
// This repository manages only its own resources in the environment. Other
// repositories export their own partial name.
// See https://docs.railway.com/infrastructure-as-code#multi-repo-projects
export const partial = 'wintskill-sms';
export default defineRailway(() => {
  const wintskillSms = service('wintskill-sms', {
    source: github('dewMyth/wintskill-management-system', {
      branch: 'release/0.1.0',
      checkSuites: false,
    }),
    build: {
      buildEnvironment: 'V3',
      builder: 'DOCKERFILE',
      dockerfilePath: 'Dockerfile',
    },
    healthcheck: '/api/v1/health',
    healthcheckTimeout: 120,
    preDeploy: 'npx prisma migrate deploy',
    replicas: { 'asia-southeast1-eqsg3a': 1 },
  });

  return project('wintskill-sms', {
    variables: { managed: false },
    resources: [wintskillSms],
  });
});
