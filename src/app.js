const express = require('express');
const fs = require('fs').promises; // Using fs promises API for file operations
const path = require('path');
const { promisify } = require('util');
const { exec } = require('child_process');

const app = express();

// Middleware
app.use(express.json());

// Serve static files from the 'assets' directory
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Configuration
const port = process.env.PORT || 8080; // Fetch port from environment variable or default to 8080
const namespace = process.env.NAMESPACE || 'default'; // Default to 'default' if NAMESPACE is not set

// Utility function to execute a command
const executeCommand = promisify(exec);

// Utility function to list YAML files
async function listYamlFiles(directory) {
    try {
        const files = await fs.readdir(directory);
        return files.filter(file => file.endsWith('.yaml'));
    } catch (error) {
        throw new Error(`Error listing YAML files: ${error.message}`);
    }
}

// Route handlers
app.get('/yamlFiles', async (req, res) => {
    try {
        const yamlFiles = await listYamlFiles(path.join(__dirname, 'yamlFiles'));
        res.json(yamlFiles);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send(error.message || 'Internal Server Error');
    }
});

app.get('/', async (req, res) => {
    try {
        const data = await fs.readFile(path.join(__dirname, 'index.html'), 'utf8');
        res.send(data);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send(error.message || 'Internal Server Error');
    }
});

app.post('/execute', async (req, res) => {
    const selectedFileName = req.body.selectedFileName;
    const filePath = path.join(__dirname, 'yamlFiles', selectedFileName);
    try {
        await executeCommand(`oc apply -f ${filePath} -n ${namespace}`);
        res.send('Command executed successfully');
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send(error.message || 'Unknown error occurred');
    }
});

app.get('/health/readiness', async (req, res) => {
    try {
        const yamlFiles = await listYamlFiles(path.join(__dirname, 'yamlFiles'));
        if (yamlFiles.length === 0) {
            res.sendStatus(400); // Respond with 400 if no YAML files found
        } else {
            res.sendStatus(200); // Respond with 200 if ready
        }
    } catch (error) {
        console.error('Error:', error);
        res.sendStatus(500); // Respond with 500 if error reading directory
    }
});

app.get('/health/liveness', async (req, res) => {
    const selectedFileName = 'generic-app.yaml'; // Example YAML file name
    const filePath = path.join(__dirname, 'yamlFiles', selectedFileName);
    try {
        await executeCommand(`oc apply -f ${filePath} -n ${namespace}`);
        res.sendStatus(200); // Respond with 200 if alive
    } catch (error) {
        console.error('Error:', error);
        res.sendStatus(400); // Respond with 400 if OC command fails
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Received SIGTERM signal. Shutting down gracefully...');
    // Perform cleanup operations here if needed
    server.close(() => {
        console.log('Server has been gracefully terminated.');
        process.exit(0);
    });
});

const server = app.listen(port, () => {
    console.log(`Server is listening at http://localhost:${port}`);
});
