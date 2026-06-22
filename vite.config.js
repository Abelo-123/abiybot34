import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    root: '.', // Ensure Vite uses the current directory as the root
    base: '/paxyo-bot-front/', // Replace <repository-name> with your GitHub repository name
    publicDir: 'public', // Specify the public directory for static assets
    plugins: [react()],
    server: {
        proxy: {
            '/api': 'https://paxyo-bot-ywuk.onrender.com'
        }
    }
});
