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
    const isRaw = req.body.isRaw;

    const processRawData = (data) => {
        let index = data.search(/[:=]/);
        if (index !== -1) {
            let firstPart = data.slice(0, index);
            let secondPart = data.slice(index + 1);
            return firstPart + "=" + secondPart;
        }
        return data;
    }

    // Split each line, strip white spaces and send back this as response
    const processData = (data) => {
        return data.split('\n').filter(line => line.trim() !== '').map(line => {
            // Find the first occurrence of ':' or '='
            const index = Math.min(...[':', '='].map(sep => line.indexOf(sep)).filter(index => index !== -1));
            if (index === -1) {
                return line.trim();
            }
            // Split the line into two parts
            const parts = [line.slice(0, index), line.slice(index + 1)].map(part => part.trim());
            // Add quotes around the second part
            if (parts.length > 1) {
                parts[1] = `'${parts[1]}'`;
            }
            
            return parts.join('=');
        });
    } 

        const rawCommands = `--from-literal='${processRawData(data)}' \\`;
        // Construct the kubectl and kubeseal commands
        const commands = processData(data).reverse().map(line => {
            return `--from-literal=${line} \\`;
        }).join('\n');

        const command = `
    kubectl create secret generic mysecret \\
    ${isRaw === 'true' ? rawCommands : commands}
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
