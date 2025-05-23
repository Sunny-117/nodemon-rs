const http = require('http');
const { exec } = require('child_process');
const { platform } = process;

const PORT = 4000;

// Function to kill process on port
function killProcessOnPort(port) {
    return new Promise((resolve, reject) => {
        const cmd = platform === 'win32'
            ? `netstat -ano | findstr :${port}`
            : `lsof -i :${port} -t`;

        exec(cmd, (error, stdout) => {
            if (error) {
                console.log(`No process found on port ${port}`);
                resolve();
                return;
            }

            const pid = platform === 'win32'
                ? stdout.split('\n')[0].split(/\s+/)[4]
                : stdout.trim();

            if (pid) {
                const killCmd = platform === 'win32'
                    ? `taskkill /F /PID ${pid}`
                    : `kill -9 ${pid}`;

                exec(killCmd, (err) => {
                    if (err) {
                        console.error(`Error killing process: ${err}`);
                        reject(err);
                    } else {
                        console.log(`Process on port ${port} was killed`);
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    });
}

// Create server with auto port handling
async function startServer() {
    try {
        await killProcessOnPort(PORT);
        
        const server = http.createServer((req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('Hello World! Auto-restart test - ' + new Date().toISOString() + '\n');
        });

        server.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT} - ${new Date().toISOString()}`);
        });

        server.on('error', async (e) => {
            if (e.code === 'EADDRINUSE') {
                console.log(`Port ${PORT} is busy, attempting to kill existing process...`);
                await killProcessOnPort(PORT);
                server.listen(PORT);
            }
        });

    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

startServer();