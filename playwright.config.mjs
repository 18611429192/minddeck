import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir:'./tests/e2e',
  timeout:30000,
  fullyParallel:true,
  use:{baseURL:'http://127.0.0.1:8080',trace:'retain-on-failure'},
  webServer:{command:'python -m http.server 8080',url:'http://127.0.0.1:8080',reuseExistingServer:true},
  projects:[
    {name:'desktop-chromium',use:{...devices['Desktop Chrome']}},
    {name:'mobile-chromium',use:{...devices['Pixel 7']}}
  ]
});
