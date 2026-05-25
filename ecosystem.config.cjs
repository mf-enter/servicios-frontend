module.exports = {
    apps: [
        {
            name: "servicios-frontend",
            script: "cmd.exe",
            args: "/c npm run preview:public",
            cwd: __dirname,
            watch: false,
            env: {
                NODE_ENV: "production"
            },
            env_production: {
                NODE_ENV: "production"
            }
        }
    ]
};