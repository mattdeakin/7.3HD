// sonar-project.js
const sonarqubeScanner = require('sonarqube-scanner');
// require('dotenv').config(); // Jenkins will provide env vars

const sonarToken = process.env.SONAR_LOGIN_TOKEN; // Jenkins provides this
const sonarHostUrl = process.env.SONAR_HOST_URL || 'http://localhost:9000';
const projectVersion = process.env.PROJECT_VERSION || '1.0.0-local'; // Jenkins provides PROJECT_VERSION

sonarqubeScanner(
  {
    serverUrl: sonarHostUrl,
    token: sonarToken,
    options: {
      'sonar.projectName': 'Matthew Todo API (Jenkins)', // A descriptive name
      'sonar.projectKey': 'matthewod_todo-api-jenkins', // Unique key
      'sonar.projectVersion': projectVersion,
      'sonar.sources': '.', // Analyze current directory
      'sonar.tests': 'tests', // Directory containing test files
      'sonar.test.inclusions': 'tests/**/*.test.js', // Pattern for test files
      'sonar.javascript.lcov.reportPaths': 'coverage/lcov.info', // Path to LCOV coverage report
      'sonar.testExecutionReportPaths': 'junit.xml', // Path to JUnit test execution report
      'sonar.exclusions': [ // Files/directories to exclude from analysis
        'node_modules/**',
        'coverage/**',
        'dist/**',
        'build/**',
        '.env',
        '.env.*',
        'Dockerfile',
        'docker-compose.yml',
        'Jenkinsfile',
        'sonar-project.js',
        'tests/setup.js', // Exclude test setup files if they don't contain testable code
        '.git/**',
        '.vscode/**',
        '.idea/**'
      ].join(','), // Comma-separated string
      'sonar.sourceEncoding': 'UTF-8',
    },
  },
  (error) => {
    if (error) {
      console.error('Error during SonarQube scan:', error);
      process.exit(1);
    }
    console.log('SonarQube scan finished.');
    process.exit();
  }
);