// Jenkinsfile
pipeline {
    agent any // Runs on any available agent. For more complex setups, you might specify a Docker agent.

    environment {
        // Credential IDs (MUST match IDs configured in Jenkins Credentials)
        DOCKERHUB_CREDENTIALS_ID = 'dockerhub-credentials'
        SONAR_TOKEN_CREDENTIAL_ID = 'sonarqube-token-todo-api'
        SNYK_TOKEN_CREDENTIAL_ID = 'snyk-auth-token'
        RENDER_STAGING_DEPLOY_HOOK_CRED_ID = 'render-staging-deploy-hook' // Placeholder initially
        RENDER_PROD_DEPLOY_HOOK_CRED_ID = 'render-production-deploy-hook'   // Placeholder initially

        // Docker Configuration - *** REPLACE 'yourdockerhubusername' with your actual Docker Hub username ***
        DOCKER_REGISTRY_URL = '' // Keep empty for default Docker Hub, or specify e.g., 'yourdockerhubusername' if login requires it
        DOCKER_IMAGE_NAME = "mattdeakin/matthew-todo-api" // *** Use your Docker Hub username here ***

        // SonarQube Configuration
        SONAR_HOST_URL = 'http://localhost:9000' // Jenkins SonarQube server URL

        // Snyk Configuration - *** REPLACE with your Snyk Organization Slug ***
        SNYK_ORG_SLUG = 'mattdeakin'

        // Node.js Version for Jenkins Tool
        NODE_VERSION = '18'
        JDK_VERSION = 'jdk17' // Name of JDK tool in Jenkins

        // General Build Info
        CI = 'true' // Common environment variable for CI environments
    }

    tools {
        nodejs "${NODE_VERSION}" // Matches NodeJS installation name in Jenkins Global Tool Config
        jdk "${JDK_VERSION}"     // Matches JDK installation name in Jenkins Global Tool Config
    }

    stages {
        stage('1. Checkout Source Code') {
            steps {
                script {
                    echo "Cleaning workspace..."
                    cleanWs() // Clean the workspace before checkout

                    echo "Checking out code from SCM..."
                    checkout scm // Checks out from the Git repository configured in the Jenkins job

                    echo "Determining build tags and versions..."
                    env.GIT_COMMIT_SHORT = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
                    def timestamp = new Date().format('yyyyMMddHHmmss', TimeZone.getTimeZone('UTC'))
                    env.IMAGE_TAG = "${env.GIT_COMMIT_SHORT}-${timestamp}-${env.BUILD_NUMBER}"
                    env.PROJECT_VERSION = "1.0.${env.BUILD_NUMBER}" // Used for SonarQube project version

                    echo "Git Commit (Short): ${env.GIT_COMMIT_SHORT}"
                    echo "Docker Image Tag: ${env.IMAGE_TAG}"
                    echo "SonarQube Project Version: ${env.PROJECT_VERSION}"
                }
            }
        }

        stage('2. Install Dependencies') {
            steps {
                echo "Installing Node.js project dependencies using 'npm ci'..."
                // 'npm ci' is generally faster and more reliable for CI builds than 'npm install'
                // It requires a package-lock.json or npm-shrinkwrap.json file.
                sh 'npm ci'
            }
        }

        stage('3. Run Unit & Integration Tests') {
            steps {
                echo "Running tests and generating code coverage reports..."
                // The 'npm test' script should be configured in package.json to run Jest
                // and generate coverage (e.g., lcov) and a JUnit XML report.
                sh 'npm test'
            }
            post {
                always {
                    echo "Archiving test results and code coverage..."
                    junit 'junit.xml' // Archive JUnit XML test results (make sure jest-junit is configured)
                    publishHTML([
                        allowMissing: true,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'coverage/lcov-report', // Directory of LCOV HTML report
                        reportFiles: 'index.html',          // Main HTML file for the coverage report
                        reportName: 'Code Coverage Report'
                    ])
                }
            }
        }

        stage('4. Code Quality Analysis (SonarQube)') {
            steps {
                echo "Performing SonarQube analysis..."
                // SONAR_LOGIN_TOKEN_ENV will hold the actual token string from Jenkins credentials
                withCredentials([string(credentialsId: "${SONAR_TOKEN_CREDENTIAL_ID}", variable: 'SONAR_LOGIN_TOKEN_ENV')]) {
                    // Pass necessary properties to the sonar-scanner script
                    // sonar-project.js will pick these up via process.env or direct CLI args
                    sh "node sonar-project.js \
                        -Dsonar.login=${SONAR_LOGIN_TOKEN_ENV} \
                        -Dsonar.projectVersion=${env.PROJECT_VERSION} \
                        -Dsonar.host.url=${SONAR_HOST_URL}"
                }

                echo "Waiting for SonarQube Quality Gate result..."
                timeout(time: 10, unit: 'MINUTES') { // Wait up to 10 minutes
                    // The waitForQualityGate step uses the SonarQube server configured in
                    // Jenkins > Manage Jenkins > Configure System.
                    // It polls SonarQube until the analysis is complete and a Quality Gate status is available.
                    script {
                        def qg = waitForQualityGate()
                        if (qg.status != 'OK') {
                            error "Pipeline aborted: SonarQube Quality Gate failed with status: ${qg.status}"
                        }
                        echo "SonarQube Quality Gate Status: ${qg.status}"
                    }
                }
            }
        }

        stage('5. Security Scan (Snyk)') {
            steps {
                // SNYK_TOKEN_ENV_VAR will hold the Snyk API token
                withCredentials([string(credentialsId: "${SNYK_TOKEN_CREDENTIAL_ID}", variable: 'SNYK_TOKEN_ENV_VAR')]) {
                    echo "Running Snyk Open Source vulnerability scan..."
                    // Fails the build if medium or higher severity vulnerabilities are found.
                    // Adjust --severity-threshold as needed (e.g., high, critical).
                    // The --org flag links the test results to your Snyk organization.
                    sh "snyk test --severity-threshold=medium --org=${SNYK_ORG_SLUG}"

                    // Optional: Monitor project for future vulnerabilities (reports snapshot to Snyk dashboard)
                    // echo "Monitoring project with Snyk..."
                    // sh "snyk monitor --org=${SNYK_ORG_SLUG}"
                }
            }
        }

        stage('6. Build & Push Docker Image') {
            steps {
                script {
                    echo "Building Docker image: ${DOCKER_IMAGE_NAME}:${env.IMAGE_TAG}"
                    sh "docker build -t ${DOCKER_IMAGE_NAME}:${env.IMAGE_TAG} ."

                    echo "Tagging Docker image as ${DOCKER_IMAGE_NAME}:latest"
                    sh "docker tag ${DOCKER_IMAGE_NAME}:${env.IMAGE_TAG} ${DOCKER_IMAGE_NAME}:latest"

                    // DOCKER_USER and DOCKER_PASS will be populated from Jenkins credentials
                    withCredentials([usernamePassword(credentialsId: "${DOCKERHUB_CREDENTIALS_ID}", usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                        echo "Logging in to Docker Hub as ${DOCKER_USER}..."
                        // Use DOCKER_REGISTRY_URL if pushing to a private registry or specific Docker Hub org, otherwise it defaults to Docker Hub.
                        sh "echo \"${DOCKER_PASS}\" | docker login -u \"${DOCKER_USER}\" --password-stdin ${DOCKER_REGISTRY_URL}"

                        echo "Pushing Docker image ${DOCKER_IMAGE_NAME}:${env.IMAGE_TAG} to Docker Hub..."
                        sh "docker push ${DOCKER_IMAGE_NAME}:${env.IMAGE_TAG}"

                        echo "Pushing Docker image ${DOCKER_IMAGE_NAME}:latest to Docker Hub..."
                        sh "docker push ${DOCKER_IMAGE_NAME}:latest"
                    }
                }
            }
            post {
                always {
                    echo "Logging out from Docker Hub..."
                    sh "docker logout ${DOCKER_REGISTRY_URL}"
                }
            }
        }

        stage('7. Deploy to Staging (Render via Deploy Hook)') {
            steps {
                script {
                    echo "Triggering Render Staging deployment for image ${DOCKER_IMAGE_NAME}:latest..."
                    // STAGING_HOOK_URL will hold the secret deploy hook URL from Jenkins credentials
                    withCredentials([string(credentialsId: "${RENDER_STAGING_DEPLOY_HOOK_CRED_ID}", variable: 'STAGING_HOOK_URL')]) {
                        // Check if the hook URL is not a placeholder before attempting to curl
                        if (STAGING_HOOK_URL != 'placeholder-staging-hook-url' && STAGING_HOOK_URL.startsWith('https://')) {
                            sh "curl -X POST \"${STAGING_HOOK_URL}\""
                            echo "Render Staging deployment triggered via deploy hook."
                            echo "Monitor Render dashboard for actual deployment progress."
                            // Optional: Wait for Render to deploy (adjust time as needed)
                            // sleep(time: 90, unit: 'SECONDS')
                        } else {
                            echo "Skipping Render Staging deployment: Deploy Hook URL is a placeholder or invalid."
                            echo "Please configure the Render service and update the 'render-staging-deploy-hook' credential in Jenkins."
                        }
                    }
                }
            }
        }

        stage('8. Release to Production (Render via Deploy Hook)') {
            // This stage includes a manual approval step
            input {
                message "Promote to Production on Render?"
                ok "Yes, Release to Production"
                // submitter "user_or_group_allowed_to_approve" // Optional: restrict who can approve
            }
            steps {
                script {
                    echo "Triggering Render Production deployment for image ${DOCKER_IMAGE_NAME}:latest..."
                    // PROD_HOOK_URL will hold the secret deploy hook URL
                    withCredentials([string(credentialsId: "${RENDER_PROD_DEPLOY_HOOK_CRED_ID}", variable: 'PROD_HOOK_URL')]) {
                        if (PROD_HOOK_URL != 'placeholder-prod-hook-url' && PROD_HOOK_URL.startsWith('https://')) {
                            sh "curl -X POST \"${PROD_HOOK_URL}\""
                            echo "Render Production deployment triggered via deploy hook."
                            echo "Monitor Render dashboard for actual deployment progress."
                        } else {
                            echo "Skipping Render Production deployment: Deploy Hook URL is a placeholder or invalid."
                            echo "Please configure the Render service and update the 'render-production-deploy-hook' credential in Jenkins."
                        }
                    }
                }
            }
        }
        
        stage('9. Monitoring Check (Conceptual - Render)') {
            // This is a conceptual check. Real monitoring is continuous via Prometheus/Grafana.
            steps {
                script {
                    echo "Verifying Production App Health on Render (Conceptual)..."
                    // Give Render some time to finish deployment if the previous stage just ran
                    sleep(time: 120, unit: 'SECONDS') // Wait 2 minutes

                    // *** REPLACE 'your-actual-render-prod-app-name.onrender.com' with your Render production URL ***
                    def prodAppUrl = "https://matthew-todo-api-prod.onrender.com" // Example, use your actual URL

                    try {
                        echo "Attempting to curl production app main page: ${prodAppUrl}/"
                        sh "curl --fail --silent --show-error --connect-timeout 10 --max-time 20 ${prodAppUrl}/"
                        echo "Main page seems responsive."

                        echo "Attempting to curl production app metrics endpoint: ${prodAppUrl}/metrics"
                        sh "curl --fail --silent --show-error --connect-timeout 10 --max-time 20 ${prodAppUrl}/metrics | grep http_requests_total"
                        echo "Production app on Render and /metrics endpoint appear to be responding."
                    } catch (Exception e) {
                        // Don't fail the build for this conceptual check, but log it clearly.
                        echo "Warning: Could not verify Render production app health or metrics endpoint."
                        echo "Error was: ${e.getMessage()}"
                        echo "This could be due to ongoing deployment on Render, network issues, or incorrect URL."
                    }
                    echo "Remember to check Prometheus targets and Grafana dashboards for ongoing monitoring status."
                }
            }
        }
    }

    post {
    // Runs regardless of the pipeline's success or failure
    always {
        // cleanWs() needs to be in an agent context
        node { // <<< THIS IS THE IMPORTANT WRAPPER
            echo "Pipeline execution finished. Cleaning workspace..."
            // Clean up the workspace to save disk space on the Jenkins agent
            cleanWs()
        } // <<< AND ITS CLOSING BRACE
    }
    // Runs only if the pipeline is successful
    success {
        echo "Pipeline completed successfully!"
        // Add notifications here (e.g., Slack, Email) if desired
    }
    // Runs only if the pipeline failed
    failure {
        echo "Pipeline failed. Please check console output and logs."
        // Add notifications here
    }
}