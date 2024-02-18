const express = require('express');
const path = require('path');
const app = express();
const { exec } = require('child_process');
const port = 8080;

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

app.get('/api/status', (req, res) => {
    return res.status(200).json({ status: 'ok' });
});

app.post('/api/encrypt', (req, res) => {
    // Get the data from the request body
    const data = req.body.data;

    // Split each line, strip white spaces and send back this as response
    const processedData = data.split('\n').map(line => {
        // Split the line by ':' or '='
        const parts = line.split(/[:=]/).map(part => part.trim());
        return parts.join('=');
    });

        // Construct the kubectl and kubeseal commands
        const commands = processedData.map(line => {
            return `--from-literal=${line} \\`;
        }).join('\n');

        const command = `
    kubectl create secret generic mysecret \\
    ${commands}
    --dry-run=client -oyaml | kubeseal \\
    --cert /usr/src/app/sealed-secrets/sealed.crt \\
    --format yaml --scope=cluster-wide | yq e '.spec.encryptedData' -
    `;
    
    // Execute the command
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            res.status(500).send(`Error executing command: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            res.status(500).send(`Error executing command: ${stderr}`);
            return;
        }
        // Replace \n with new lines and remove quotes
        const modifiedStdout = stdout.replace(/\\n/g, '\n').replace(/(^")|("$)/g, '');
        // Send the output of the command back as the response
        res.send(modifiedStdout);
    });

    //res.json(command);
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
