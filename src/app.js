const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

const app = express();
const port = process.env.PORT || 8080; // Port from environment variable or default to 8080

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the 'assets' directory
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Endpoint to list YAML files
app.get('/yamlFiles', (req, res) => {
    fs.readdir(path.join(__dirname, 'yamlFiles'), (err, files) => {
        if (err) {
            res.status(500).send(err);
            return;
        }
        const yamlFiles = files.filter(file => file.endsWith('.yaml'));
        res.json(yamlFiles);
    });
});

// Serve HTML page with namespace injected
app.get('/', (req, res) => {
    fs.readFile(path.join(__dirname, 'index.html'), 'utf8', (err, data) => {
        if (err) {
            res.status(500).send(err);
            return;
        }
        // Inject namespace into HTML before sending
        const htmlWithData = data.replace('{{NAMESPACE}}', process.env.NAMESPACE || 'default');
        res.send(htmlWithData);
    });
});

// Execute command
app.post('/execute', (req, res) => {
    const selectedFileName = req.body.selectedFileName;
    const namespace = req.body.namespace || process.env.NAMESPACE || 'default'; // Default to 'default' if NAMESPACE is not set
    const filePath = path.join(__dirname, 'yamlFiles', selectedFileName);
    exec(`oc create -f ${filePath} -n ${namespace}`, (err, stdout, stderr) => {
        if (err) {
            console.error('Error:', err);
            console.error('stderr:', stderr);
            res.status(500).send(err.message || stderr || 'Unknown error occurred');
            return;
        }
        console.log('stdout:', stdout);
        res.send('Command executed successfully');
    });
});

// Health check endpoint for readiness probe
app.get('/health/readiness', (req, res) => {
    fs.readdir(path.join(__dirname, 'yamlFiles'), (err, files) => {
        if (err) {
            console.error('Error reading directory:', err);
            res.sendStatus(500); // Respond with 500 if error reading directory
            return;
        }
        if (files.length === 0) {
            console.log('No YAML files found');
            res.sendStatus(400); // Respond with 400 if no YAML files found
            return;
        }
        res.sendStatus(200); // Respond with 200 if ready
    });
});

// Health check endpoint for liveness probe
app.get('/health/liveness', (req, res) => {
    const selectedFileName = 'generic-app.yaml'; // Example YAML file name
    const namespace = req.body.namespace || process.env.NAMESPACE || 'default'; // Default to 'default' if NAMESPACE is not set
    const filePath = path.join(__dirname, 'yamlFiles', selectedFileName);
    exec(`oc create -f ${filePath} -n ${namespace}`, (err, stdout, stderr) => {
        if (err) {
            console.error('Error:', err);
            console.error('stderr:', stderr);
            res.sendStatus(400); // Respond with 400 if OC command fails
            return;
        }
        console.log('stdout:', stdout);
        res.sendStatus(200); // Respond with 200 if alive
    });
});

app.listen(port, () => {
    const hostname = os.hostname();
    console.log(`Server is listening at http://${hostname}:${port}`);
});
