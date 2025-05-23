console.log('This is the default index.js file');
console.log('Current time:', new Date().toISOString());

// Add some async operation to keep the process running
setInterval(() => {
    console.log('Heartbeat:', new Date().toISOString());
}, 2000);