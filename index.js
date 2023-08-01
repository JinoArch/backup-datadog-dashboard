const { readFileSync } = require('fs');
const { join } = require('path');
const AWS = require('aws-sdk');
const fetch = require('node-fetch');
const core = require('@actions/core');

const apiKey = core.getInput('datadog-api-key');
const s3 = new AWS.S3({
  accessKeyId: core.getInput('aws-access-key-id'),
  secretAccessKey: core.getInput('aws-secret-access-key'),
});

async function fetchDashboards() {
  const response = await fetch('https://api.datadoghq.com/api/v1/dash', {
    headers: { 'DD-API-KEY': apiKey },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch dashboards from Datadog API.');
  }

  const { dashboards } = await response.json();
  return dashboards;
}

async function fetchDashboardConfig(dashboardId) {
    const response = await fetch(`https://api.datadoghq.com/api/v1/dash/${dashboardId}`, {
      headers: { 'DD-API-KEY': apiKey },
    });
  
    if (!response.ok) {
      throw new Error('Failed to fetch dashboard configuration from Datadog API.');
    }
  
    return response.json();
  }

async function backupDashboards() {
  try {
    const dashboards = await fetchDashboards();

    for (const dashboard of dashboards) {
      const { title, id } = dashboard;
      const dashboardConfig = await fetchDashboardConfig(id);

      const params = {
        Bucket: core.getInput('s3-bucket-name'),
        Key: `${title}.json`,
        Body: JSON.stringify(dashboardConfig),
      };

      await s3.upload(params).promise();
      console.log(`Dashboard "${title}" backed up successfully.`);
    }
  } catch (error) {
    console.error('Error during dashboard backup:', error);
  }
}

backupDashboards();
